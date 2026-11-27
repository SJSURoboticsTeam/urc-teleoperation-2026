"""RTK base-station control: survey-in mode and status for the base ZED-F9P."""
import asyncio
import math
import threading
import time
from collections import deque

from gps import rtk_available

if rtk_available:
    from pyubx2 import SET_LAYER_RAM, TXN_NONE, UBXMessage

UNAVAILABLE_MESSAGE = "RTK unavailable: pyubx2 is not installed, run ./update.sh on the Base Pi"

RTCM_RATES = {
    "CFG_MSGOUT_RTCM_3X_TYPE1005_USB": 1,
    "CFG_MSGOUT_RTCM_3X_TYPE1074_USB": 1,
    "CFG_MSGOUT_RTCM_3X_TYPE1084_USB": 1,
    "CFG_MSGOUT_RTCM_3X_TYPE1094_USB": 1,
    "CFG_MSGOUT_RTCM_3X_TYPE1124_USB": 1,
    "CFG_MSGOUT_RTCM_3X_TYPE1230_USB": 5,
}
ALWAYS_ON = [
    ("CFG_USBOUTPROT_UBX", 1),
    ("CFG_USBOUTPROT_NMEA", 1),
    ("CFG_USBOUTPROT_RTCM3X", 1),
    ("CFG_MSGOUT_UBX_NAV_SVIN_USB", 1),
]
TMODE_KEYS = ["CFG_TMODE_MODE", "CFG_TMODE_SVIN_MIN_DUR", "CFG_TMODE_SVIN_ACC_LIMIT"]

MIN_DURATION_RANGE_S = (30, 3600)
ACCURACY_LIMIT_RANGE_M = (0.5, 20)
SVIN_STALE_S = 5
RATE_WINDOW_S = 5
TYPE_WINDOW_S = 10
SETUP_RETRY_S = 5

controller = None


def _ram_set(pairs):
    return UBXMessage.config_set(SET_LAYER_RAM, TXN_NONE, pairs)


class RtcmStats:
    """Rate and message types of the RTCM frames the receiver emits (fed from the reader thread)."""

    def __init__(self):
        self._lock = threading.Lock()
        self._frames = deque()
        self._type_seen = {}

    def on_frame(self, raw: bytes):
        now = time.monotonic()
        msg_type = ((raw[3] << 4) | (raw[4] >> 4)) if len(raw) >= 5 else None
        with self._lock:
            self._frames.append((now, len(raw)))
            if msg_type is not None:
                self._type_seen[msg_type] = now

    def snapshot(self):
        now = time.monotonic()
        with self._lock:
            while self._frames and now - self._frames[0][0] > RATE_WINDOW_S:
                self._frames.popleft()
            total = sum(size for _, size in self._frames)
            last = self._frames[-1][0] if self._frames else None
            types = sorted(str(t) for t, seen in self._type_seen.items() if now - seen <= TYPE_WINDOW_S)
        return {
            "bytesPerSec": round(total / RATE_WINDOW_S),
            "lastFrameAgeS": round(now - last, 1) if last is not None else None,
            "messageTypes": types,
        }


class RtkController:
    def __init__(self, sio, serial_ports, offline):
        self.sio = sio
        self.serial_ports = serial_ports
        self.offline = offline
        self.stats = RtcmStats()
        self.configuring = False
        self.error = None
        self.tmode = None
        self.min_duration_s = None
        self.accuracy_limit_m = None
        self._seen = None
        self._gps = None
        self._retry_after = 0.0
        self.rover = {
            "linked": False, "forwarding": False, "forwarded": 0,
            "lastResult": "NONE", "lastAckAgeS": None, "dropped": 0,
        }
        self._mock_start = None
        self._mock_valid_at = None

    def _current_gps(self):
        return None if self.offline else self.serial_ports["gps"]["port"]

    def _snapshot(self):
        if self.offline:
            return self._mock_snapshot()
        gps = self._current_gps()
        snap = {
            "connected": gps is not None, "tmode": self.tmode, "valid": False,
            "elapsedS": None, "meanAccM": None, "rtcm": self.stats.snapshot(),
        }
        svin = gps.svin if gps is not None else None
        if svin is not None and time.monotonic() - gps.svin_time < SVIN_STALE_S:
            snap["valid"] = bool(svin.valid)
            snap["elapsedS"] = int(svin.dur)
            snap["meanAccM"] = round(svin.meanAcc / 10000, 3)
        return snap

    def _mock_snapshot(self):
        snap = {
            "connected": True, "tmode": 0, "valid": False, "elapsedS": None, "meanAccM": None,
            "rtcm": {"bytesPerSec": 0, "lastFrameAgeS": None, "messageTypes": []},
        }
        if self._mock_start is None:
            return snap
        t = time.monotonic() - self._mock_start
        limit = self.accuracy_limit_m
        mean_acc = limit * 0.7 + limit * 3 * math.exp(-t / 10)
        if self._mock_valid_at is None and t >= self.min_duration_s and mean_acc <= limit:
            self._mock_valid_at = time.monotonic()
        valid = self._mock_valid_at is not None
        types = ["1074", "1084", "1094", "1124", "1230"] + (["1005"] if valid else [])
        snap.update(
            tmode=1, valid=valid, meanAccM=round(mean_acc, 3),
            elapsedS=int((self._mock_valid_at if valid else time.monotonic()) - self._mock_start),
            rtcm={"bytesPerSec": 410, "lastFrameAgeS": 0.5, "messageTypes": sorted(types)},
        )
        return snap

    def _state(self, snap):
        if not rtk_available or not snap["connected"]:
            return "off"
        if self.configuring:
            return "configuring"
        if snap["tmode"] in (None, 0):
            return "error" if self.error else "off"
        # Observation messages flow from second 0 of a survey, so only `valid` means ready.
        return "active" if snap["tmode"] == 2 or snap["valid"] else "surveying"

    def survey_valid(self):
        return self._state(self._snapshot()) == "active"

    def status(self):
        snap = self._snapshot()
        state = self._state(snap)
        surveying = snap["tmode"] == 1
        return {
            "available": rtk_available,
            "gpsConnected": snap["connected"],
            "state": state,
            "survey": {
                "elapsedS": snap["elapsedS"] if surveying else None,
                "minDurationS": self.min_duration_s,
                "meanAccM": snap["meanAccM"] if surveying else None,
                "accuracyLimitM": self.accuracy_limit_m,
                "valid": state == "active",
            },
            "rtcm": snap["rtcm"],
            "rover": self.rover,
            "error": self.error if rtk_available else UNAVAILABLE_MESSAGE,
        }

    async def emit_status(self):
        await self.sio.emit("rtkStatus", self.status())

    def _read_tmode(self, gps):
        values = gps.poll_cfg(TMODE_KEYS)
        return {
            "tmode": int(values["CFG_TMODE_MODE"]),
            "min_duration_s": int(values["CFG_TMODE_SVIN_MIN_DUR"]),
            "accuracy_limit_m": values["CFG_TMODE_SVIN_ACC_LIMIT"] / 10000,
        }

    def _setup_receiver(self, gps):
        gps.on_rtcm = self.stats.on_frame
        gps.send_ubx(_ram_set(ALWAYS_ON))
        return self._read_tmode(gps)

    def _enable(self, gps, min_duration_s, accuracy_limit_m):
        # Deliberate repeat: re-asserts the output settings in case connect-time setup failed.
        gps.send_ubx(_ram_set(ALWAYS_ON))
        gps.send_ubx(_ram_set([("CFG_TMODE_MODE", 0)]))
        gps.svin = None
        gps.send_ubx(_ram_set(
            [("CFG_TMODE_SVIN_MIN_DUR", min_duration_s),
             ("CFG_TMODE_SVIN_ACC_LIMIT", int(round(accuracy_limit_m * 10000))),
             ("CFG_TMODE_MODE", 1)]
            + list(RTCM_RATES.items())
        ))
        gps.svin = None
        return self._read_tmode(gps)

    def _disable(self, gps):
        gps.send_ubx(_ram_set([("CFG_TMODE_MODE", 0)] + [(key, 0) for key in RTCM_RATES]))
        gps.svin = None
        return self._read_tmode(gps)

    def _apply(self, info):
        self.tmode = info["tmode"]
        self.min_duration_s = info["min_duration_s"]
        self.accuracy_limit_m = info["accuracy_limit_m"]

    async def _sync_receiver(self):
        gps = self._current_gps()
        if gps is not self._seen:
            self._seen = gps
            self.tmode = self.min_duration_s = self.accuracy_limit_m = None
            self.error = None
            self.rover["forwarded"] = self.rover["dropped"] = 0
            self._retry_after = 0.0
        if gps is None or gps is self._gps or not rtk_available or not gps.reader_active:
            return
        if time.monotonic() < self._retry_after:
            return
        async with self.serial_ports["gps"]["lock"]:
            if self._current_gps() is not gps:
                return
            try:
                self._apply(await asyncio.to_thread(self._setup_receiver, gps))
                if self._current_gps() is gps:
                    self._gps = gps
                    self.error = None
            except Exception as e:
                if self._current_gps() is gps:
                    self.error = f"Could not read the receiver's base mode: {e}"
                    self._retry_after = time.monotonic() + SETUP_RETRY_S
                    print(f"RTK setup failed, retrying in {SETUP_RETRY_S}s: {e}")

    async def run(self):
        while True:
            try:
                await self._sync_receiver()
                await self.emit_status()
            except Exception as e:
                print(f"RTK status loop error: {e}")
            await asyncio.sleep(1)

    @staticmethod
    def _validate(data):
        if not isinstance(data, dict) or not isinstance(data.get("enabled"), bool):
            raise ValueError("'enabled' must be true or false")
        if not data["enabled"]:
            return False, None, None
        duration = data.get("minDurationS")
        limit = data.get("accuracyLimitM")
        if isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration != int(duration):
            raise ValueError("'minDurationS' must be a whole number of seconds")
        if not MIN_DURATION_RANGE_S[0] <= duration <= MIN_DURATION_RANGE_S[1]:
            raise ValueError("Survey time must be between %d and %d seconds" % MIN_DURATION_RANGE_S)
        if isinstance(limit, bool) or not isinstance(limit, (int, float)) or not math.isfinite(limit):
            raise ValueError("'accuracyLimitM' must be a number of metres")
        if not ACCURACY_LIMIT_RANGE_M[0] <= limit <= ACCURACY_LIMIT_RANGE_M[1]:
            raise ValueError("Accuracy limit must be between %s and %s metres" % ACCURACY_LIMIT_RANGE_M)
        return True, int(duration), float(limit)

    async def set_base_mode(self, data):
        try:
            enabled, min_duration_s, accuracy_limit_m = self._validate(data)
        except ValueError as e:
            return {"status": "ERROR", "error": str(e)}
        if not rtk_available:
            return {"status": "ERROR", "error": UNAVAILABLE_MESSAGE}
        if self.offline:
            return await self._set_mock_mode(enabled, min_duration_s, accuracy_limit_m)

        async with self.serial_ports["gps"]["lock"]:
            gps = self._current_gps()
            if gps is None or not gps.reader_active:
                return {"status": "ERROR", "error": "GPS is not connected"}
            self.configuring = True
            self.error = None
            await self.emit_status()
            try:
                if enabled:
                    info = await asyncio.to_thread(self._enable, gps, min_duration_s, accuracy_limit_m)
                else:
                    info = await asyncio.to_thread(self._disable, gps)
                if self._current_gps() is gps:
                    self._apply(info)
                    self.rover["forwarded"] = self.rover["dropped"] = 0
                return {"status": "OK"}
            except Exception as e:
                message = f"Receiver configuration failed: {e}"
                print(f"RTK: {message}")
                if self._current_gps() is gps:
                    self.error = message
                    try:
                        self._apply(await asyncio.to_thread(self._disable, gps))
                    except Exception:
                        self.tmode = None
                return {"status": "ERROR", "error": message}
            finally:
                self.configuring = False
                await self.emit_status()

    async def _set_mock_mode(self, enabled, min_duration_s, accuracy_limit_m):
        self.error = None
        self._mock_valid_at = None
        self._mock_start = time.monotonic() if enabled else None
        if enabled:
            self.min_duration_s, self.accuracy_limit_m = min_duration_s, accuracy_limit_m
        await self.emit_status()
        return {"status": "OK"}


def register_rtk_events(sio, serial_ports, offline):
    global controller
    controller = RtkController(sio, serial_ports, offline)

    @sio.event
    async def getRtkStatus(sid):
        return controller.status()

    @sio.event
    async def setRtkBaseMode(sid, data):
        return await controller.set_base_mode(data)


async def rtk_status_loop():
    await controller.run()
