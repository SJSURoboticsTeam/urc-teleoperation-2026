"""Science mission state: sites, stepping and sensor readings.

ScienceSession talks to firmware through an injected link (send_step, send_stop,
is_mock) and reports changes through an async on_change callback. The link
reports firmware events back through the handle_* methods.
"""

import asyncio
import math
from datetime import datetime

SITE_COUNT = 3
SCIENCE_STEPS = ["Start"] + [f"Step {i}" for i in range(1, 11)]  # placeholder until the real procedure is defined
WAVELENGTHS_NM = [415, 455, 480, 515, 555, 590, 630, 680]
VIAL_NAMES = ("purple", "blue", "red")
STEP_TIMEOUT_S = 60.0
SATURATION_COUNT = 65535  # 16-bit ADC max, the true value is unknown
MAX_ENVIRONMENT_READINGS = 200


def find_saturated(counts):
    return [i for i, c in enumerate(counts) if c >= SATURATION_COUNT]


def compute_absorbance(vial_counts, clear_counts):
    """-log10(vial / clear) per channel, rounded to 3 decimals.
    None where a count is not positive, since NaN/inf are not valid JSON."""
    if len(vial_counts) != len(clear_counts):
        raise ValueError(
            f"channel count mismatch: vial has {len(vial_counts)}, clear has {len(clear_counts)}"
        )
    absorbance = []
    for vial, clear in zip(vial_counts, clear_counts):
        if vial <= 0 or clear <= 0:
            absorbance.append(None)
        else:
            absorbance.append(round(-math.log10(vial / clear), 3))
    return absorbance


def _now_iso():
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


class _Site:
    def __init__(self, site_id):
        self.id = site_id
        self.name = f"Site {site_id + 1}"
        self.wipe()

    def wipe(self):
        self.status = "not_started"  # not_started | in_progress | stepping | complete
        self.current_step = -1       # last completed step, -1 = none
        self.pending_step = None
        self.last_error = None
        self.started_at = None
        self.completed_at = None
        self.clear = None
        self.vials = {}
        self.environment = []

    def to_dict(self):
        vials = {
            name: {
                "raw": list(raw),
                "absorbance": compute_absorbance(raw, self.clear) if self.clear is not None else None,
                "saturated": find_saturated(raw),
            }
            for name, raw in self.vials.items()
        }
        clear = None
        if self.clear is not None:
            clear = {"raw": list(self.clear), "saturated": find_saturated(self.clear)}
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "currentStep": self.current_step,
            "pendingStep": self.pending_step,
            "lastError": self.last_error,
            "startedAt": self.started_at,
            "completedAt": self.completed_at,
            "spectro": {"clear": clear, "vials": vials},
            "environment": [dict(e) for e in self.environment],
        }


class ScienceSession:
    """Commands take the raw socket payload and return (status, reason), where
    status is "OK", "DENIED" (invalid right now or a bad payload) or "ERROR"
    (transport failure). New state is delivered through on_change.

    Each command checks and sets state with no await in between, so two clients
    pressing Step at the same moment cannot both pass the check."""

    def __init__(self, link=None, logger=None, on_change=None,
                 step_timeout_s=STEP_TIMEOUT_S, steps=None, site_count=SITE_COUNT):
        self.link = link
        self.logger = logger
        self.on_change = on_change
        self.step_timeout_s = step_timeout_s
        self.steps = list(steps) if steps is not None else list(SCIENCE_STEPS)
        self.sites = [_Site(i) for i in range(site_count)]
        self.stopped = False
        self._timers = {}  # site id -> timeout task; held so it isn't garbage collected
        self._last_site = None  # sensor readings that arrive after the last step go here

    def _active_site(self):
        for site in self.sites:
            if site.status in ("in_progress", "stepping"):
                return site
        return None

    def to_dict(self):
        active = self._active_site()
        return {
            "mock": bool(getattr(self.link, "is_mock", False)),
            "stopped": self.stopped,
            "activeSite": active.id if active else None,
            "steps": list(self.steps),
            "wavelengths": list(WAVELENGTHS_NM),
            "logFile": getattr(self.logger, "filename", None),
            "sites": [site.to_dict() for site in self.sites],
        }

    async def _changed(self):
        if self.on_change is None:
            return
        try:
            await self.on_change(self.to_dict())
        except Exception as e:
            print(f"[SCIENCE] on_change failed: {e}")

    def _log(self, type_, **fields):
        if self.logger is None:
            return
        try:
            self.logger.log(type_, **fields)
        except Exception as e:
            print(f"[SCIENCE] log failed ({type_}): {e}")

    def log_event(self, type_, **fields):
        """For the link: log through the session's logger (errors are caught and printed)."""
        self._log(type_, **fields)

    def active_site_id(self):
        """Id of the site in_progress/stepping, or None. For attributing firmware events."""
        active = self._active_site()
        return active.id if active else None

    def pending_step(self):
        """Index of the step in flight, or None. For acks that carry no step number."""
        site = self._pending_site()
        return site.pending_step if site else None

    def _parse_site(self, data):
        if not isinstance(data, dict):
            return None, "Missing site"
        index = data.get("site")
        if isinstance(index, bool) or not isinstance(index, int) or not 0 <= index < len(self.sites):
            return None, f"Invalid site: {index!r}"
        return self.sites[index], None

    async def start_site(self, data):
        site, reason = self._parse_site(data)
        if site is None:
            return "DENIED", reason
        if self.stopped:
            return "DENIED", "Science is stopped; reset first"
        if site.status != "not_started":
            return "DENIED", f"{site.name} is {site.status.replace('_', ' ')}"
        active = self._active_site()
        if active is not None:
            return "DENIED", f"{active.name} is still in progress"

        site.status = "in_progress"
        site.current_step = 0
        site.started_at = _now_iso()
        site.last_error = None
        self._last_site = site.id
        self._log("site_started", site=site.id)
        await self._changed()
        return "OK", None

    async def step(self, data):
        site, reason = self._parse_site(data)
        if site is None:
            return "DENIED", reason
        if self.stopped:
            return "DENIED", "Science is stopped; reset first"
        if site.status == "stepping":
            return "DENIED", "Step already in progress"
        if site.status == "not_started":
            return "DENIED", f"{site.name} has not been started"
        if site.status == "complete":
            return "DENIED", f"{site.name} is already complete"
        if self.link is None:
            return "ERROR", "No science link configured"

        # pending is set before the send so a second Step during the send is denied
        step_index = site.current_step + 1
        site.pending_step = step_index
        site.status = "stepping"
        site.last_error = None
        self._log("step_sent", site=site.id, step=step_index)

        try:
            sent = await self.link.send_step(site.id, step_index)
            error = None if sent else "Could not send step to firmware (is science CAN connected?)"
        except Exception as e:
            sent, error = False, f"Science link error: {e}"

        if not sent:
            # a stop or ack during the send may already have cleared pending
            if site.pending_step == step_index:
                site.pending_step = None
                site.status = "in_progress"
            site.last_error = error
            self._log("step_send_failed", site=site.id, step=step_index, data={"error": error})
            await self._changed()
            return "ERROR", error

        if site.pending_step == step_index:
            self._start_timer(site.id, step_index)
        await self._changed()
        return "OK", None

    async def stop(self, data=None):
        """Cancel any pending step and refuse start/step until reset."""
        for site_id in list(self._timers):
            self._cancel_timer(site_id)
        active = self._active_site()
        for site in self.sites:
            if site.pending_step is not None:
                site.pending_step = None
                site.status = "in_progress"
        self.stopped = True
        self._log("estop", site=active.id if active else None)

        sent = True
        error = None
        if self.link is not None:
            try:
                sent = await self.link.send_stop()
            except Exception as e:
                sent, error = False, f"Science link error: {e}"
        await self._changed()
        if not sent:
            return "ERROR", error or "Science stopped in software, but firmware was not told to stop"
        return "OK", None

    async def reset(self, data=None):
        """Clear the stop latch. With {"site": n}, also wipe that site back to not_started."""
        site = None
        if data is not None:
            if not isinstance(data, dict):
                return "DENIED", "Invalid payload"
            if data.get("site") is not None:
                site, reason = self._parse_site(data)
                if site is None:
                    return "DENIED", reason
                if site.status == "stepping":
                    return "DENIED", "Step in progress; stop first"

        self.stopped = False
        if site is not None:
            site.wipe()
            if self._last_site == site.id:
                self._last_site = None
        self._log("reset", site=site.id if site else None)
        await self._changed()
        return "OK", None

    def _pending_site(self):
        for site in self.sites:
            if site.pending_step is not None:
                return site
        return None

    async def handle_step_finished(self, step):
        site = self._pending_site()
        if site is None or site.pending_step != step:
            self._log("stale_ack_ignored", step=step, site=site.id if site else None)
            return False

        self._cancel_timer(site.id)
        site.current_step = step
        site.pending_step = None
        site.last_error = None
        if step >= len(self.steps) - 1:
            site.status = "complete"
            site.completed_at = _now_iso()
        else:
            site.status = "in_progress"
        self._log("step_finished", site=site.id, step=step)
        await self._changed()
        return True

    def _reading_site(self):
        active = self._active_site()
        if active is not None:
            return active
        return self.sites[self._last_site] if self._last_site is not None else None

    def _reject_reading(self, kind, reason, **raw):
        self._log("reading_rejected", data={"kind": kind, "reason": reason, **{k: repr(v)[:200] for k, v in raw.items()}})
        return False

    async def handle_color_reading(self, vial, channels):
        """vial is "clear" (the reference) or one of VIAL_NAMES; channels is one raw count per wavelength."""
        if vial != "clear" and vial not in VIAL_NAMES:
            return self._reject_reading("color", "unknown vial", vial=vial, channels=channels)
        if (not isinstance(channels, (list, tuple)) or len(channels) != len(WAVELENGTHS_NM)
                or not all(isinstance(c, int) and not isinstance(c, bool) and 0 <= c <= SATURATION_COUNT for c in channels)):
            return self._reject_reading("color", "bad channels", vial=vial, channels=channels)

        raw = list(channels)
        site = self._reading_site()
        if site is None:
            self._log("reading_unattributed", data={"kind": "color", "vial": vial, "raw": raw})
            return False

        if vial == "clear":
            site.clear = raw
            absorbance = None
        else:
            site.vials[vial] = raw
            absorbance = compute_absorbance(raw, site.clear) if site.clear is not None else None
        self._log("color_reading", site=site.id,
                  data={"vial": vial, "raw": raw, "absorbance": absorbance, "saturated": find_saturated(raw)})
        await self._changed()
        return True

    async def handle_environment_reading(self, pressure_hpa, humidity_pct, temperature_c):
        values = {"pressure_hpa": pressure_hpa, "humidity_pct": humidity_pct, "temperature_c": temperature_c}
        if not all(_is_number(v) for v in values.values()):
            return self._reject_reading("environment", "not a finite number", **values)

        site = self._reading_site()
        if site is None:
            self._log("reading_unattributed", data={"kind": "environment", **values})
            return False

        site.environment.append({"t": _now_iso(), **values})
        del site.environment[:-MAX_ENVIRONMENT_READINGS]
        self._log("environment_reading", site=site.id, data=values)
        await self._changed()
        return True

    def _start_timer(self, site_id, step):
        self._cancel_timer(site_id)
        self._timers[site_id] = asyncio.get_running_loop().create_task(self._timeout_after(site_id, step))

    def _cancel_timer(self, site_id):
        task = self._timers.pop(site_id, None)
        if task is not None:
            task.cancel()

    async def _timeout_after(self, site_id, step):
        await asyncio.sleep(self.step_timeout_s)
        self._timers.pop(site_id, None)  # already running, so don't cancel ourselves
        site = self.sites[site_id]
        if site.pending_step != step:
            return
        site.pending_step = None
        site.status = "in_progress"  # operator can press Step to retry
        site.last_error = f"{self.steps[step]} timed out"
        self._log("step_timeout", site=site.id, step=step)
        await self._changed()

    def close(self):
        for site_id in list(self._timers):
            self._cancel_timer(site_id)


def register_science_events(sio, session):
    """Commands reply with {status, reason}; the new state arrives via the scienceSession broadcast."""

    def reply(result):
        status, reason = result
        return {"status": status, "reason": reason}

    @sio.event
    async def getScienceSession(sid, data=None):
        return session.to_dict()

    @sio.event
    async def scienceStartSite(sid, data=None):
        return reply(await session.start_site(data))

    @sio.event
    async def scienceStep(sid, data=None):
        return reply(await session.step(data))

    @sio.event
    async def scienceStop(sid, data=None):
        return reply(await session.stop(data))

    @sio.event
    async def scienceReset(sid, data=None):
        return reply(await session.reset(data))
