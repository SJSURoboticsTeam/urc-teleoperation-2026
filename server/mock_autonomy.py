import asyncio
import math
from datetime import datetime, timezone

import gps
import rover_mode
from rover_mode import AUTONOMY, READY, NAVIGATING, ARRIVED, RETURNING, TYPING, state, reply, broadcast, log

SPEED_M_S = 5.0
TICK_S = 0.5
ARRIVAL_RADIUS_M = 3.0  # stopping within 3 meters is successful
RETURN_RADIUS_M = 5.0
TYPE_INTERVAL_S = 0.7   # time between typed launch-key characters
# used when there is no GPS fix yet; inside the area the fake GPS data uses
START_POSITION = {"latitude": 37.3345, "longitude": -121.8825}

# simulated rover position, set on the first navigation run
position = None

def distance_m(a, b):
    """Return distance in meters between two GPS points."""
    dy = (b["latitude"] - a["latitude"]) * 111320
    dx = (b["longitude"] - a["longitude"]) * 111320 * math.cos(math.radians(a["latitude"]))
    return math.hypot(dx, dy)

def to_float(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None

def find_target(target_id):
    return next((t for t in state["targets"] if t["id"] == target_id), None)

def target_name(target):
    return target["label"] or target["id"]

async def emit_position(sio):
    gps.latest_fix = dict(position)
    await sio.emit("gpsData", {
        "latitude": position["latitude"],
        "longitude": position["longitude"],
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "accuracy_m": 0.5,
        "accuracy_source": "MOCK",
    })

async def drive_to(sio, target, run, radius, returning, emit_gps):
    """Move the simulated rover toward target until it arrives or the run is replaced."""
    global position
    try:
        if position is None:
            position = dict(gps.latest_fix or START_POSITION)
        if emit_gps:
            # once the mock drives, it owns the simulated position
            gps.fake_gps_paused = True
        while rover_mode.run_id == run:
            dist = distance_m(position, target)
            if dist <= radius:
                await arrive(sio, target, returning)
                return
            step = min(SPEED_M_S * TICK_S, dist) / dist
            position["latitude"] += (target["latitude"] - position["latitude"]) * step
            position["longitude"] += (target["longitude"] - position["longitude"]) * step
            if emit_gps:
                await emit_position(sio)
            await asyncio.sleep(TICK_S)
    except Exception as e:
        print(f"[MOCK AUTONOMY] navigation failed: {e}")
        # a stale run must not overwrite a newer one
        if rover_mode.run_id == run:
            rover_mode.set_mode(AUTONOMY, READY, f"Navigation failed: {e}")
            await log(sio, state["message"])
            await broadcast(sio)

async def arrive(sio, target, returning):
    if returning:
        rover_mode.set_mode(AUTONOMY, READY, f"Returned to {target_name(target)}")
        state["activeTargetId"] = None
    else:
        rover_mode.set_mode(AUTONOMY, ARRIVED, f"Arrived at {target_name(target)}")
        if target["id"] not in state["visitedTargetIds"]:
            state["visitedTargetIds"].append(target["id"])
    await log(sio, state["message"])
    await broadcast(sio)

async def type_sequence(sio, run):
    """Type the launch key one character at a time until done or the run is replaced."""
    sequence = state["typing"]["sequence"]
    try:
        for char in sequence:
            await asyncio.sleep(TYPE_INTERVAL_S)
            if rover_mode.run_id != run:
                return
            state["typing"]["typed"] += char
            await log(sio, f"typed {char}", tag="AUTONOMY TYPING")
            await broadcast(sio)
        if rover_mode.run_id == run:
            rover_mode.set_mode(AUTONOMY, READY, f"Finished typing {sequence}")
            await log(sio, state["message"])
            await broadcast(sio)
    except Exception as e:
        print(f"[MOCK AUTONOMY] typing failed: {e}")
        if rover_mode.run_id == run:
            rover_mode.set_mode(AUTONOMY, READY, f"Typing failed: {e}")
            await log(sio, state["message"])
            await broadcast(sio)

def register_mock_autonomy_events(sio, emit_gps):
    def start_drive(target, phase, message, radius):
        rover_mode.set_mode(AUTONOMY, phase, message)
        state["activeTargetId"] = target["id"]
        sio.start_background_task(drive_to, sio, target, rover_mode.run_id, radius, phase == RETURNING, emit_gps)

    @sio.event
    async def setTargets(sid, data=None):
        # targets can be reprogrammed only while the rover is stopped
        if state["phase"] in (NAVIGATING, RETURNING):
            return reply("DENIED", "Can't change targets while the rover is moving")
        state["targets"] = [
            {
                "id": str(t.get("id")),
                "label": str(t.get("label") or ""),
                "latitude": to_float(t.get("latitude")),
                "longitude": to_float(t.get("longitude")),
            }
            for t in (data or {}).get("targets", [])
        ]
        await broadcast(sio)
        return reply("OK")

    @sio.event
    async def goToTarget(sid, data=None):
        target = find_target((data or {}).get("targetId"))
        if state["mode"] != AUTONOMY:
            return reply("DENIED", "Start autonomy first")
        if state["phase"] not in (READY, ARRIVED):
            return reply("DENIED", f"Can't start navigation while {state['phase']}")
        if target is None or target["latitude"] is None or target["longitude"] is None:
            return reply("ERROR", "Target needs a latitude and longitude")
        start_drive(target, NAVIGATING, f"Navigating to {target_name(target)}", ARRIVAL_RADIUS_M)
        await log(sio, state["message"])
        await broadcast(sio)
        return reply("OK")

    @sio.event
    async def abortAutonomy(sid, data=None):
        """Stop navigating, or return autonomously to a visited location."""
        if state["phase"] not in (NAVIGATING, RETURNING):
            return reply("DENIED", "The rover isn't navigating")
        return_id = (data or {}).get("returnToTargetId")
        if return_id:
            target = find_target(return_id)
            if target is None or return_id not in state["visitedTargetIds"]:
                return reply("DENIED", "Can only return to a visited location")
            start_drive(target, RETURNING, f"Aborted, returning to {target_name(target)}", RETURN_RADIUS_M)
        else:
            rover_mode.set_mode(AUTONOMY, READY, "Navigation aborted")
            state["activeTargetId"] = None
        await log(sio, state["message"])
        await broadcast(sio)
        return reply("OK")

    @sio.event
    async def startTyping(sid, data=None):
        """Mimic typing a launch key with the arm. The expected key is shared so every client can check it."""
        data = data or {}
        sequence = str(data.get("sequence") or "").strip().upper()
        if state["mode"] != AUTONOMY:
            return reply("DENIED", "Start autonomy first")
        if state["phase"] not in (READY, ARRIVED):
            return reply("DENIED", f"Can't start typing while {state['phase']}")
        if not sequence:
            return reply("ERROR", "Nothing to type")
        rover_mode.set_mode(AUTONOMY, TYPING, f"Typing {sequence}")
        state["typing"] = {"expected": str(data.get("expected") or "").strip().upper(), "sequence": sequence, "typed": ""}
        sio.start_background_task(type_sequence, sio, rover_mode.run_id)
        await log(sio, state["message"])
        await broadcast(sio)
        return reply("OK")

    @sio.event
    async def stopTyping(sid):
        if state["phase"] != TYPING:
            return reply("DENIED", "The rover isn't typing")
        rover_mode.set_mode(AUTONOMY, READY, "Typing stopped")
        await log(sio, state["message"])
        await broadcast(sio)
        return reply("OK")

    @sio.event
    async def restartMission(sid):
        if state["mode"] == AUTONOMY:
            return reply("DENIED", "Stop autonomy before restarting the mission")
        state["targets"] = []
        state["activeTargetId"] = None
        state["visitedTargetIds"] = []
        state["typing"] = {"expected": "", "sequence": "", "typed": ""}
        state["message"] = "Mission restarted"
        await broadcast(sio)
        return reply("OK")
