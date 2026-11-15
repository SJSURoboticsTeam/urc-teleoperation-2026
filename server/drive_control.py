"""Drive "take control": only one socket.io client (sid) may drive at a time."""
import rover_mode

# sid of the client allowed to drive, or None if nobody is driving
controller_sid = None


def is_drive_controller(sid):
    return controller_sid is not None and sid == controller_sid


def get_drive_control_state():
    return {"controllerSid": controller_sid}


async def release_drive_control(sio, stop_drive_motors, sid):
    """If sid holds control: clear it, stop the motors, tell every client."""
    global controller_sid
    if not is_drive_controller(sid):
        return False
    controller_sid = None                 # stop accepting its commands first
    if rover_mode.state["mode"] == rover_mode.TELEOPERATION:
        rover_mode.set_mode(rover_mode.IDLE)
    await stop_drive_motors()             # takes drive_command_lock, so this is the last write
    await sio.emit("driveControlState", get_drive_control_state())
    await rover_mode.broadcast(sio)
    print(f"[DRIVE CONTROL] released by {sid}")
    return True


async def revoke_drive_control(sio, stop_drive_motors):
    """Take control away from whoever holds it (used when autonomy starts)."""
    if controller_sid is None:
        return False
    return await release_drive_control(sio, stop_drive_motors, controller_sid)


def register_drive_control_events(sio, stop_drive_motors):
    @sio.event
    async def getDriveControl(sid):
        return get_drive_control_state()

    @sio.event
    async def requestDriveControl(sid):
        global controller_sid
        # nobody gets control during autonomy, so drive commands from every client are ignored
        if rover_mode.state["mode"] == rover_mode.AUTONOMY:
            return {"status": "DENIED", "reason": "Autonomy is running", **get_drive_control_state()}
        # no await between the check and the assignment, so two clients can't both win
        if controller_sid is not None and controller_sid != sid:
            return {"status": "DENIED", **get_drive_control_state()}
        controller_sid = sid
        if rover_mode.state["mode"] == rover_mode.IDLE:
            rover_mode.set_mode(rover_mode.TELEOPERATION)
        print(f"[DRIVE CONTROL] taken by {sid}")
        await sio.emit("driveControlState", get_drive_control_state())
        await rover_mode.broadcast(sio)
        return {"status": "OK", **get_drive_control_state()}

    @sio.event
    async def releaseDriveControl(sid):
        released = await release_drive_control(sio, stop_drive_motors, sid)
        return {"status": "OK" if released else "ERROR", **get_drive_control_state()}
