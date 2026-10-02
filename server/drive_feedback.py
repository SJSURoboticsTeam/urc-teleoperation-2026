"""Drive feedback state, emitter, and offline simulator.

The rover already reports its swerve module angles and its measured chassis
velocities. Until now both were decoded in drive.py / drive_uart.py and thrown
away with a print(). This module collects them in one place and pushes them to
the frontend.

Two socket events are produced:
    wheelAngles   {fLAngle, fRAngle, bLAngle, bRAngle}
    driveFeedback {xVel, yVel, rotVel, commanded: {...}}

Design notes:
  - Parsing stays in drive.py / drive_uart.py and remains pure. Those modules
    hand decoded values to DriveFeedbackState; this module owns the emitting.
    Same split arm.py uses (parse_arm_data -> read_arm_can_loop emits).
  - Firmware reports ONE module per RETURN_OFFSET frame, so angles are
    accumulated here and published together on a timer instead of per frame.
"""

import asyncio
import math
import random
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

CORNERS = ("fL", "fR", "bL", "bR")

# How long without a frame from firmware before we treat the feed as dead and
# stop publishing. The frontend has its own 3s timeout on top of this.
FRESH_WINDOW_SECONDS = 2.0


class DriveFeedbackState:
    """Collects drive telemetry from whichever transport is active.

    One instance is created in py_server.py and handed to the read loop (or the
    simulator) and to the emitter. Keeping it an object rather than module
    globals means both transports write to a single visible owner, and it can
    be exercised in a test without a socket.
    """

    def __init__(self):
        # Last angle seen per corner, in degrees. None means never reported.
        self._angles = {corner: None for corner in CORNERS}
        # Measured chassis velocities, real units.
        self._measured = {"xVel": None, "yVel": None, "rotVel": None}
        # Most recent command we sent, so the UI can show commanded vs actual.
        self._commanded = {"xVel": 0.0, "yVel": 0.0, "rotVel": 0.0}
        # True once a real operator command arrives. Lets the simulator drive
        # itself for a demo until someone actually takes the controls.
        self._command_seen = False
        # monotonic() timestamp of the last frame received from firmware.
        self._last_frame_at = None
        # Rate-limit unknown-module warnings; the console is noisy enough.
        self._last_warn_at = 0.0

    # ---------- writers ----------

    def note_command(self, x_vel, y_vel, rot_vel):
        """Record what we just asked the rover to do (not a firmware frame)."""
        self._commanded = {
            "xVel": float(x_vel),
            "yVel": float(y_vel),
            "rotVel": float(rot_vel),
        }
        self._command_seen = True

    def note_demo_command(self, x_vel, y_vel, rot_vel):
        """Same, but for the simulator's self-driven pattern.

        Deliberately does not set _command_seen, so a real command from the
        operator still takes over the moment one arrives.
        """
        self._commanded = {
            "xVel": float(x_vel),
            "yVel": float(y_vel),
            "rotVel": float(rot_vel),
        }

    def has_operator_command(self):
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
        self._last_frame_at = time.monotonic()

    def note_velocities(self, x_vel, y_vel, rot_vel):
        """Record measured chassis velocities, already in real units."""
        self._measured = {
            "xVel": float(x_vel),
            "yVel": float(y_vel),
            "rotVel": float(rot_vel),
        }
        self._last_frame_at = time.monotonic()

    # ---------- readers ----------

    def has_fresh_data(self):
        """True while firmware is still talking to us.

        Deliberately keyed on when a frame last ARRIVED, not on whether the
        numbers changed. A parked rover still reports; it is not offline. If we
        went quiet whenever values held steady, a stationary rover would look
        dead and a dead one would look stationary.
        """
        if self._last_frame_at is None:
            return False
        return (time.monotonic() - self._last_frame_at) < FRESH_WINDOW_SECONDS

    def wheel_payload(self):
        """wheelAngles event body. Corners never reported stay None.

        None travels to the browser as null, and the UI renders that as
        "unknown" rather than drawing the wheel at 0 degrees. 0 is a real,
        plausible angle, so defaulting to it would be a convincing lie.
        """
        return {
            "fLAngle": self._angles["fL"],
            "fRAngle": self._angles["fR"],
            "bLAngle": self._angles["bL"],
            "bRAngle": self._angles["bR"],
        }

    def velocity_payload(self):
        """driveFeedback event body: measured values plus what we commanded."""
        return {
            "xVel": self._measured["xVel"],
            "yVel": self._measured["yVel"],
            "rotVel": self._measured["rotVel"],
            "commanded": dict(self._commanded),
        }

    def commanded(self):
        return dict(self._commanded)


def apply_parsed(state, parsed):
    """Feed one decoded frame into the state.

    Both transports decode different wire formats into the same small dicts,
    so this is the single place that knows how a parsed frame maps onto state.
    Velocities arrive still scaled as fixed-point integers; the inverse of the
    send-side scaling is applied here.
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

    Why a timer instead of emitting inside the read loop: firmware sends one
    module per offset frame, so per-frame emitting would produce four partial
    updates per cycle. Coalescing also keeps us off the control link, which
    runs ~1-7 Mbit/s over 900MHz and already carries a drive command every
    500ms (FrameRateConstant).

    While firmware is quiet we publish nothing, which lets the frontend's own
    staleness timer fire and show NO DATA.
    """
    interval = 1.0 / hz
    while True:
        try:
            if state.has_fresh_data():
                await sio.emit("wheelAngles", state.wheel_payload())
                await sio.emit("driveFeedback", state.velocity_payload())
        except Exception as exc:
            print(f"Drive feedback emit error: {exc}")
        await asyncio.sleep(interval)


# =================== Offline simulator ===================
# Mirrors send_fake_gps_data() in gps.py: when the server is started with
# --offline we generate plausible telemetry instead of reading hardware, so the
# feature can be developed and demonstrated with no rover attached.

# Module positions in the rover frame, metres. x forward, y left.
_HALF_LENGTH = 0.35
_HALF_WIDTH = 0.30
_MODULE_OFFSETS = {
    "fL": (_HALF_LENGTH, _HALF_WIDTH),
    "fR": (_HALF_LENGTH, -_HALF_WIDTH),
    "bL": (-_HALF_LENGTH, _HALF_WIDTH),
    "bR": (-_HALF_LENGTH, -_HALF_WIDTH),
}

# Corner that refuses to move, to demonstrate the divergence warning.
# Set to None for a healthy rover.
STALLED_CORNER = "bR"

# How quickly measured values converge on commanded ones. 0..1 per tick.
_LAG = 0.18

# Self-driving pattern used until a real command arrives, so the feature is
# demonstrable without a gamepad plugged in.
DEMO_X_AMPLITUDE = 1.5      # m/s
DEMO_X_RATE = 0.35          # rad/s
DEMO_ROT_AMPLITUDE = 25.0   # deg/s
DEMO_ROT_RATE = 0.25        # rad/s


def _target_angles(x_vel, y_vel, rot_vel):
    """Swerve steering angles for a commanded chassis motion.

    Each module's ground velocity is the chassis translation plus the tangential
    component from rotation about the centre; the steering angle is that
    vector's direction.
    """
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
            if state.has_operator_command():
                # A controller is driving; follow it.
                command = state.commanded()
            else:
                # Nobody has sent a command yet - a gamepad is the only thing
                # that produces one, so without this the whole panel would sit
                # at zero and the feature would look broken during a demo.
                elapsed = time.monotonic() - started_at
                state.note_demo_command(
                    DEMO_X_AMPLITUDE * math.cos(elapsed * DEMO_X_RATE),
                    0.0,
                    DEMO_ROT_AMPLITUDE * math.sin(elapsed * DEMO_ROT_RATE),
                )
                command = state.commanded()
            targets = _target_angles(command["xVel"], command["yVel"], command["rotVel"])

            for corner in CORNERS:
                if corner == STALLED_CORNER:
                    # Jammed module: drifts slightly but never reaches target.
                    current[corner] += random.uniform(-0.4, 0.4)
                else:
                    target = targets[corner]
                    if target is not None:
                        delta = target - current[corner]
                        # Take the short way round the circle.
                        delta = (delta + 180.0) % 360.0 - 180.0
                        current[corner] += delta * _LAG
                    current[corner] += random.uniform(-0.2, 0.2)

                state.note_offset(
                    _corner_to_position(corner),
                    current[corner] * OFFSET_UNITS_PER_DEGREE,
                )

            # Measured velocity trails commanded, and falls well short while a
            # module is stalled.
            efficiency = 0.15 if STALLED_CORNER else 1.0
            for axis in ("xVel", "yVel", "rotVel"):
                goal = command[axis] * efficiency
                measured[axis] += (goal - measured[axis]) * _LAG
                measured[axis] += random.uniform(-0.01, 0.01)

            state.note_velocities(measured["xVel"], measured["yVel"], measured["rotVel"])

        except Exception as exc:
            print(f"Drive simulator error: {exc}")

        await asyncio.sleep(0.1)


def _corner_to_position(corner):
    """Inverse of MODULE_POSITION_TO_CORNER, so the simulator exercises the
    same lookup path the real transports use."""
    for position, name in MODULE_POSITION_TO_CORNER.items():
        if name == corner:
            return position
    return -1
