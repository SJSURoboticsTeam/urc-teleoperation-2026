import asyncio
from dataclasses import dataclass

@dataclass
class AntennaData:
    txon: bool = False
    mode: str = "off" # off, gps, angle, waypoint
    manualAngle: int = 0
    waypointLat: None
    waypointLong: None

antennadata = AntennaData()

async def antennaloop(sio, gps_heading):
    print("Starting loop")
    while True:
        # only run if txon enabled, otherwise user can pulse it
        if(antennadata.txon):
            await antennasend(gps_heading)
        await asyncio.sleep(1)


async def antennasend(gps_heading):
    if antennadata.mode == "off":
        print("ANTENNA MODE: OFF")
    elif antennadata.mode == "angle":
        print("ANTENNA MODE: ANGLE of " + str(antennadata.manualAngle))
    elif antennadata.mode == "gps":
        if(gps_heading != None):
            print("ANTENNA MODE: GPS, heading of " + str(round(gps_heading["headingDegrees"], 2)))
        else:
            print("ANTENNA: GPS DATA IS NULL")
    else:
        print("ANTENNA ERROR")

def register_antenna_events(sio, gps_heading):
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
        await antennasend(gps_heading)
        return "OK"
    


    @sio.event
    async def setAntennaSettings(sid, payload):
        antennadata.txon = payload["txon"]
        antennadata.mode = payload["mode"]
        antennadata.manualAngle=int(payload["manualAngle"])
        print("ANTENNA SETTINGS SYNCED")
        return "OK"