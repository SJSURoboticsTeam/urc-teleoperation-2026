"""Drive "take control": only one socket.io client (sid) may drive at a time."""

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
    await stop_drive_motors()             # takes drive_command_lock, so this is the last write
    await sio.emit("driveControlState", get_drive_control_state())
    print(f"[DRIVE CONTROL] released by {sid}")
    return True


def register_drive_control_events(sio, stop_drive_motors):
    @sio.event
    async def getDriveControl(sid):
        return get_drive_control_state()

    @sio.event
    async def requestDriveControl(sid):
        global controller_sid
        # no await between the check and the assignment, so two clients can't both win
        if controller_sid is not None and controller_sid != sid:
            return {"status": "DENIED", **get_drive_control_state()}
        controller_sid = sid
        print(f"[DRIVE CONTROL] taken by {sid}")
        await sio.emit("driveControlState", get_drive_control_state())
        return {"status": "OK", **get_drive_control_state()}

    @sio.event
    async def releaseDriveControl(sid):
        released = await release_drive_control(sio, stop_drive_motors, sid)
        return {"status": "OK" if released else "ERROR", **get_drive_control_state()}
