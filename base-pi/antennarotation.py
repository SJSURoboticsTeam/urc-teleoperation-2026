import asyncio
from dataclasses import dataclass

@dataclass
class AntennaData:
    txon: bool = False
    mode: str = "off"
    manualAngle: int = 0

antennadata = AntennaData()

async def antennaloop(sio):
    print("Starting loop")
    while True:
        # only run if txon enabled, otherwise user can pulse it
        if(antennadata.txon):
            await antennasend()
        await asyncio.sleep(1)


async def antennasend():
    print("TX MODE: " + antennadata.mode)


def register_antenna_events(sio):
    """Register metrics-related socket.io handlers.

    `sio` is expected to be a `socketio.AsyncServer` (async handlers are supported).
    """
    global numClients

    @sio.event
    async def getAntennaSettings(sid):
        data = {
            'status': "OK",
            'txon' : antennadata.txon,
            'mode' : antennadata.mode,
            'manualAngle' : antennadata.manualAngle,
            }
        return data

    @sio.event
    async def antennaPulse(sid):
        await antennasend()
        return "OK"
    


    @sio.event
    async def setAntennaSettings(sid, payload):
        antennadata.txon = payload["txon"]
        antennadata.mode = payload["mode"]
        antennadata.manualAngle=int(payload["manualAngle"])
        if(antennadata.mode == "angle"):
            print("NEW MODE: ANGLE of " + str(antennadata.manualAngle))
        else:
            print("MODE: " + antennadata.mode.upper())
        return "OK"