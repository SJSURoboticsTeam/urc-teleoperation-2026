import asyncio
from datetime import datetime

from soft_stop import is_soft_stopped

IDLE = "IDLE"
TELEOPERATION = "TELEOPERATION"
AUTONOMY = "AUTONOMY"

# phases inside AUTONOMY
READY = "READY"
NAVIGATING = "NAVIGATING"
ARRIVED = "ARRIVED"
RETURNING = "RETURNING"
TYPING = "TYPING"

state = {
    "mode": IDLE,
    "phase": None,
    "targets": [],
    "activeTargetId": None,
    "visitedTargetIds": [],
    "typing": {"expected": "", "sequence": "", "typed": ""},
    "message": "",
    # "mock" while the mock autonomy runs, None when nothing can run autonomy
    "source": None,
}

# bumped on every mode/phase change, so a running mock task can tell its run is over
run_id = 0

def get_led():
    """LED color and pattern for the current state"""

    if state["mode"] == TELEOPERATION:
        return {"color": "blue", "pattern": "solid"}
    if state["mode"] == AUTONOMY:
        if state["phase"] == ARRIVED:
            return {"color": "green", "pattern": "flash"}

        return {"color": "red", "pattern": "solid"}
    return {"color": "grey", "pattern": "solid"}    # grey when rover is idle


async def print_led(led):
    print(f"[LED] {led['color']} {led['pattern']}")

# broadcast() calls on_led_change(led) only when the LED color or pattern changes.
# For now it prints the LED. The LED demo (#198) will point it at a function that
# sends the LED over CAN. Run that blocking write with asyncio.to_thread, or the
# server freezes until the write finishes
on_led_change = print_led
# Last LED value sent, so broadcast() can skip repeats
last_led = None
# Lets one LED update finish before the next starts, so the LED ends on the latest state
led_lock = asyncio.Lock()

def get_state():
    return {**state, "led": get_led()}

def set_mode(mode, phase=None, message=""):
    """Change mode and phase."""
    global run_id
    state["mode"] = mode
    state["phase"] = phase if mode == AUTONOMY else None
    state["message"] = message
    run_id += 1

async def broadcast(sio, sid=None):
    """Send the state to every client (or one sid), and update the LED if it changed."""
    global last_led
    # the lock keeps LED updates in order even if the hook is slow
    async with led_lock:
        led = get_led()
        if led != last_led:
            last_led = led
            await on_led_change(led)
    await sio.emit("autonomyState", get_state(), room=sid)

async def log(sio, text, tag="AUTONOMY"):
    """Print to the server console and add a line to every client's autonomy history."""
    print(f"[{tag}] {text}")
    await sio.emit("autonomyLog", {"time": datetime.now().strftime("%H:%M:%S"), "text": text})

async def stop_autonomy(sio, message):
    """Stop autonomy and set rover to IDLE for every client"""
    if state["mode"] != AUTONOMY:
        return False
    set_mode(IDLE, message=message)
    state["activeTargetId"] = None
    await log(sio, message)
    await broadcast(sio)
    return True

def reply(status, reason=""):
    return {"status": status, "reason": reason, "state": get_state()}

def register_rover_mode_events(sio, revoke_drive_control, stop_drive_motors):
    async def start_autonomy():
        if state["source"] is None:
            return reply("ERROR", "No autonomy source is running")
        if is_soft_stopped():
            return reply("DENIED", "Soft Stop is active")
        if state["mode"] == AUTONOMY:
            return reply("OK")
        set_mode(AUTONOMY, READY, "Autonomy started")
        # mode is AUTONOMY first, so nobody can take drive control back in between
        await revoke_drive_control()
        await log(sio, "Autonomy started")
        await broadcast(sio)
        return reply("OK")

    async def stop_autonomy_and_motors():
        await stop_autonomy(sio, "Autonomy stopped")
        await stop_drive_motors()
        return reply("OK")

    @sio.event
    async def getAutonomyState(sid):
        return get_state()

    @sio.event
    async def startAutonomy(sid):
        return await start_autonomy()

    @sio.event
    async def stopAutonomy(sid):
        return await stop_autonomy_and_motors()

    @sio.event
    async def setRoverMode(sid, data=None):
        """Allow manual mode changing from the Status pane"""
        mode = (data or {}).get("mode")
        if mode == AUTONOMY:
            return await start_autonomy()
        if mode == IDLE:
            if state["mode"] == AUTONOMY:
                return await stop_autonomy_and_motors()
            # releasing drive control moves TELEOPERATION to IDLE
            await revoke_drive_control()
            return reply("OK")
        if mode == TELEOPERATION:
            return reply("DENIED", "Use Take Control to start Teleoperation")
        return reply("ERROR", f"Unknown mode: {mode}")