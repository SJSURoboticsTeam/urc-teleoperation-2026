import asyncio
from dataclasses import dataclass

@dataclass
class AntennaData:
    enabled: bool = False
    mode: str = "off"

antennadata = AntennaData()

async def antennaloop(sio):
    while True:
        if(antennadata.enabled):
            print("Mode" + antennadata.mode)
        await asyncio.sleep(1)


def register_antenna_events(sio):
    """Register metrics-related socket.io handlers.

    `sio` is expected to be a `socketio.AsyncServer` (async handlers are supported).
    """
    global numClients

    @sio.event
    async def getMode(sid):
        return antennadata.mode

    @sio.event
    async def setMode(data, sid):
        antennadata.mode = data
        return 1