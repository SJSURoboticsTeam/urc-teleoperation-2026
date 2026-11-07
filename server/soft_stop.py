"""Server-authoritative Soft Stop: a software e-stop lockout shared by every client."""

soft_stop_active = False


def is_soft_stopped():
    return soft_stop_active


async def set_soft_stop(sio, active, sid=None):
    global soft_stop_active
    soft_stop_active = active
    await sio.emit("softStopChanged", soft_stop_active, room=sid)
