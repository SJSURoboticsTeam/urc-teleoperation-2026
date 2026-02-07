import asyncio
import config
import can_serial
import math


def register_camera_pt_events(sio,drive_serial):
    print("registering...")
    @sio.event
    async def panCommands(sid,data):
        print("Camera Pan Commands X: " + str(data['xVel']) + " Y: " + str(data['yVel']))