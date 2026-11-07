"""Drive feedback state, emitter, and offline simulator.

Emits two socket events:
    wheelAngles   {fLAngle, fRAngle, bLAngle, bRAngle}
    driveFeedback {xVel, yVel, rotVel, commanded: {...}}

Parsing stays in drive.py / drive_uart.py; this module owns state and emitting.
Firmware reports one module per RETURN_OFFSET frame, so angles accumulate here
and publish together on a timer. Each angle and the measured velocities expire
on their own, so a reading that stops arriving is shown as unknown (None)
instead of being repeated as if it were current.
"""

import asyncio
import math
import time


# =================== Protocol assumptions ===================
# UNVERIFIED. Confirm with the drive firmware team before trusting these on
# hardware. They are isolated here so a correction is a one-line change.

# Which corner each module_position byte refers to.
MODULE_POSITION_TO_CORNER = {0: "fL", 1: "fR", 2: "bL", 3: "bR"}

# Divide a raw offset by this to get degrees. 1.0 assumes firmware already
# sends whole degrees. If the wheels spin ~100x too far, this is why.
OFFSET_UNITS_PER_DEGREE = 1.0

# Fixed-point scaling used when SENDING commands. We apply the inverse on the
# way back in. Must stay in sync with:
#   drive.py:31-35  and  drive_uart.py:24-28
CHASSIS_VEL_SCALE = 2 ** 12   # x/y velocity, m/s
ROT_VEL_SCALE = 2 ** 6        # rotational velocity, deg/s

CORNERS = tuple(MODULE_POSITION_TO_CORNER.values())
CORNER_TO_MODULE_POSITION = {v: k for k, v in MODULE_POSITION_TO_CORNER.items()}

# How long a reading from firmware stays valid after it arrives. Older readings
# are published as None. The frontend has its own 3s timeout on top of this.
FRESH_WINDOW_SECONDS = 2.0


def _is_fresh(arrived_at):
    """True if a reading that arrived at arrived_at is still within the window."""
    return arrived_at is not None and (time.monotonic() - arrived_at) < FRESH_WINDOW_SECONDS


class DriveFeedbackState:
    """Collects drive telemetry from whichever transport is active.

    One instance lives in py_server.py, shared by the read loop (or the
    simulator) and the emitter.
    """

    def __init__(self):
        """Start with nothing reported and no command sent."""
        # Per corner, degrees. None means never reported.
        self._angles = {corner: None for corner in CORNERS}
        self._measured = {"xVel": None, "yVel": None, "rotVel": None}
        self._commanded = {"xVel": 0.0, "yVel": 0.0, "rotVel": 0.0}
        # True once a real operator command arrives; lets the simulator
        # self-drive until someone takes the controls.
        self._command_seen = False
        # When each reading last arrived FROM FIRMWARE (not from us).
        self._angle_at = {corner: None for corner in CORNERS}
        self._velocities_at = None
        self._last_warn_at = 0.0     # rate-limits the unknown-module warning

    # ---------- writers ----------

    def note_command(self, x_vel, y_vel, rot_vel, from_operator=True):
        """Record what we last asked the rover to do (not a firmware frame).

        from_operator=False is the simulator's self-driven pattern, which must
        not latch _command_seen or a real command could never take over.
        """
        self._commanded = {
            "xVel": float(x_vel),
            "yVel": float(y_vel),
            "rotVel": float(rot_vel),
        }
        if from_operator:
            self._command_seen = True

    def has_operator_command(self):
        """True once a real operator command has been recorded."""
        return self._command_seen

    def note_offset(self, module_position, raw_angle):
        """Record one module's steering angle from a RETURN_OFFSET frame."""
        corner = MODULE_POSITION_TO_CORNER.get(module_position)
        if corner is None:
            now = time.monotonic()
            if now - self._last_warn_at > 5.0:
                self._last_warn_at = now
                print(f"[drive] unknown module_position {module_position!r}, ignoring")
            return

        self._angles[corner] = raw_angle / OFFSET_UNITS_PER_DEGREE
        self._angle_at[corner] = time.monotonic()

    def note_velocities(self, x_vel, y_vel, rot_vel):
        """Record measured chassis velocities, already in real units."""
        self._measured = {
            "xVel": float(x_vel),
            "yVel": float(y_vel),
            "rotVel": float(rot_vel),
        }
        self._velocities_at = time.monotonic()

    # ---------- readers ----------
    # Freshness is keyed on when a reading last ARRIVED, not on whether its
    # value changed - a parked rover still reports, and is not offline.

    def has_fresh_angles(self):
        """True while firmware is still reporting at least one wheel angle."""
        return any(_is_fresh(self._angle_at[corner]) for corner in CORNERS)

    def wheel_payload(self):
        """wheelAngles event body. A corner that was never reported, or has
        stopped reporting, is None, which the UI renders as unknown rather
        than as 0 degrees."""
        def angle(corner):
            return self._angles[corner] if _is_fresh(self._angle_at[corner]) else None

        return {
            "fLAngle": angle("fL"),
            "fRAngle": angle("fR"),
            "bLAngle": angle("bL"),
            "bRAngle": angle("bR"),
        }

    def velocity_payload(self):
        """driveFeedback event body: measured values plus what we commanded.

        The command is always known, so it is always sent. Measured values are
        None unless firmware has recently reported them.
        """
        fresh = _is_fresh(self._velocities_at)
        return {
            "xVel": self._measured["xVel"] if fresh else None,
            "yVel": self._measured["yVel"] if fresh else None,
            "rotVel": self._measured["rotVel"] if fresh else None,
            "commanded": dict(self._commanded),
        }

    def commanded(self):
        """A copy of the last commanded velocities."""
        return dict(self._commanded)


def apply_parsed(state, parsed):
    """Feed one decoded frame into the state.

    Both transports produce the same dicts, so this is the one place that maps
    a frame onto state and undoes the send-side fixed-point scaling.
    """
    if not isinstance(parsed, dict):
        return

    kind = parsed.get("type")

    if kind == "offset":
        state.note_offset(parsed["modulePosition"], parsed["rawAngle"])

    elif kind == "velocities":
        state.note_velocities(
            parsed["xVel"] / CHASSIS_VEL_SCALE,
            parsed["yVel"] / CHASSIS_VEL_SCALE,
            parsed["rotVel"] / ROT_VEL_SCALE,
        )


# =================== Emitter ===================

async def emit_drive_feedback_loop(sio, state, hz=5):
    """Publish both feedback events on a fixed timer.

    A timer rather than per-frame: one module arrives per offset frame, and the
    900MHz control link is only ~1-7 Mbit/s. While no wheel angle is fresh we
    skip wheelAngles, letting the frontend's staleness timer show NO DATA.
    driveFeedback always goes out because it carries the commanded velocity,
    which the UI needs even when firmware reports nothing.
    """
    interval = 1.0 / hz
    while True:
        try:
            if state.has_fresh_angles():
                await sio.emit("wheelAngles", state.wheel_payload())
            await sio.emit("driveFeedback", state.velocity_payload())
        except Exception as exc:
            print(f"Drive feedback emit error: {exc}")
        await asyncio.sleep(interval)


# =================== Offline simulator ===================
# Mirrors send_fake_gps_data() in gps.py - plausible telemetry with no rover.

# Module positions in the rover frame, metres. x forward, y right, to match the
# commands: the gamepad sends +yVel for stick right, and rotVel is clockwise
# (the drive firmware rotates each module's position 90 degrees clockwise).
# Angles therefore come out clockwise-positive, like Wheel.jsx's SVG rotate.
_MODULE_OFFSETS = {
    "fL": (0.35, -0.30),
    "fR": (0.35, 0.30),
    "bL": (-0.35, -0.30),
    "bR": (-0.35, 0.30),
}

# Corner that refuses to move, to demonstrate the divergence warning.
# Set to None for a healthy rover.
STALLED_CORNER = "bR"
STALLED_ANGLE = 18.0   # degrees it is jammed at, visibly off from the others

# How quickly measured values converge on commanded ones. 0..1 per tick.
_LAG = 0.18

# Self-driving pattern used until a real command arrives, so the feature is
# demonstrable without a gamepad plugged in.
DEMO_X_AMPLITUDE = 1.5      # m/s
DEMO_X_RATE = 0.35          # rad/s
DEMO_ROT_AMPLITUDE = 25.0   # deg/s
DEMO_ROT_RATE = 0.25        # rad/s


def _target_angles(x_vel, y_vel, rot_vel):
    """Swerve steering angles for a commanded chassis motion: each
    module's ground velocity is translation plus rotation about the centre, and
    the steering angle is that vector's direction."""
    omega = math.radians(rot_vel)
    angles = {}
    for corner, (mx, my) in _MODULE_OFFSETS.items():
        vx = x_vel - omega * my
        vy = y_vel + omega * mx
        if abs(vx) < 1e-3 and abs(vy) < 1e-3:
            angles[corner] = None     # no demand: hold the previous angle
        else:
            angles[corner] = math.degrees(math.atan2(vy, vx))
    return angles


async def simulate_drive_feedback(sio, state):
    """Generate drive telemetry that lags the operator's commands."""
    print("\033[92mDrive feedback simulator running (--offline)\033[0m")

    current = {corner: 0.0 for corner in CORNERS}
    measured = {"xVel": 0.0, "yVel": 0.0, "rotVel": 0.0}
    started_at = time.monotonic()

    while True:
        try:
            if not state.has_operator_command():
                # No gamepad attached, so nothing would move without this.
                elapsed = time.monotonic() - started_at
                state.note_command(
                    DEMO_X_AMPLITUDE * math.cos(elapsed * DEMO_X_RATE),
                    0.0,
                    DEMO_ROT_AMPLITUDE * math.sin(elapsed * DEMO_ROT_RATE),
                    from_operator=False,
                )
            command = state.commanded()
            targets = _target_angles(command["xVel"], command["yVel"], command["rotVel"])

            for corner in CORNERS:
                if corner == STALLED_CORNER:
                    # Jammed module: eases toward a fixed stuck angle instead of
                    # following the target. Held, not vibrating - a wheel that
                    # cannot steer should look stuck, not noisy.
                    current[corner] += (STALLED_ANGLE - current[corner]) * _LAG
                else:
                    target = targets[corner]
                    if target is not None:
                        delta = target - current[corner]
                        # Take the short way round the circle.
                        delta = (delta + 180.0) % 360.0 - 180.0
                        current[corner] += delta * _LAG

                state.note_offset(
                    CORNER_TO_MODULE_POSITION[corner],
                    current[corner] * OFFSET_UNITS_PER_DEGREE,
                )

            # Measured velocity trails commanded, and falls well short while a
            # module is stalled.
            efficiency = 0.15 if STALLED_CORNER else 1.0
            for axis in ("xVel", "yVel", "rotVel"):
                goal = command[axis] * efficiency
                measured[axis] += (goal - measured[axis]) * _LAG

            state.note_velocities(measured["xVel"], measured["yVel"], measured["rotVel"])

        except Exception as exc:
            print(f"Drive simulator error: {exc}")

        await asyncio.sleep(0.1)

