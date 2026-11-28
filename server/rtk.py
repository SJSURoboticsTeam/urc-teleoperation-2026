"""RTK corrections for the rover GPS: writes the base station's RTCM frames into the receiver."""
import asyncio
import time

MAX_PAYLOAD_BYTES = 8192

# Offline mock: fix_quality climbs 1 -> 5 -> 4 while corrections keep arriving and falls back to 1 when they stop.
MOCK_WINDOW_S = 5
MOCK_FLOAT_AFTER_S = 3
MOCK_FIXED_AFTER_S = 8
_mock = {"since": None, "last": None}

write_lock = asyncio.Lock()


def mock_fix_quality():
    now = time.monotonic()
    if _mock["last"] is None or now - _mock["last"] > MOCK_WINDOW_S:
        return 1
    elapsed = now - _mock["since"]
    if elapsed >= MOCK_FIXED_AFTER_S:
        return 4
    return 5 if elapsed >= MOCK_FLOAT_AFTER_S else 1


def _mock_corrections_seen():
    now = time.monotonic()
    if _mock["last"] is None or now - _mock["last"] > MOCK_WINDOW_S:
        _mock["since"] = now
    _mock["last"] = now


def register_rtk_events(sio, serial_ports, offline):
    @sio.event
    async def rtcmCorrections(sid, data):
        if not isinstance(data, (bytes, bytearray)) or not 0 < len(data) <= MAX_PAYLOAD_BYTES:
            return {"status": "ERROR", "error": f"expected 1 to {MAX_PAYLOAD_BYTES} bytes of RTCM data"}
        if offline:
            _mock_corrections_seen()
            return {"status": "OK", "bytes": len(data)}
        gps = serial_ports["gps"]["port"]
        if gps is None:
            return {"status": "NO_GPS"}
        if write_lock.locked():
            return {"status": "ERROR", "error": "busy"}
        try:
            async with write_lock:
                await asyncio.to_thread(gps.write_corrections, bytes(data))
        except Exception as e:
            print(f"RTK: could not write corrections: {e}")
            return {"status": "ERROR", "error": str(e)}
        return {"status": "OK", "bytes": len(data)}
