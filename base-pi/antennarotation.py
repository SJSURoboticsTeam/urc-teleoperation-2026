import asyncio
from dataclasses import dataclass


IDs = {
    "SEND_ANGLE": '050',
    "REPLY": '350',
}

@dataclass
class AntennaData:
    txon: bool = False
    mode: str = "off" # off, gps, angle, waypoint
    manualAngle: int = 0
    waypointLat: float = 0
    waypointLong: float = 0

antennadata = AntennaData()

async def antennaloop(serial_ports, gps_heading):
    print("Starting loop")
    while True:
        # only run if txon enabled, otherwise user can pulse it
        if(antennadata.txon):
            await antennasend(serial_ports, gps_heading)
        await asyncio.sleep(0.20)


async def antennasend(serial_ports, gps_heading):
    """Sends the messages to the antenna,using a status byte and then the angle in hundredths in little-endian order"""
    angle = 0.0 # actual angle
    status = 0 # 0=off, 1=on
    if antennadata.mode == "off":
        print("ANTENNA MODE: OFF")
        status = 0
        angle = 0
    elif antennadata.mode == "angle":
        print("ANTENNA MODE: ANGLE of " + str(antennadata.manualAngle))
        status = 1
        angle = antennadata.manualAngle
    elif antennadata.mode == "gps":
        if(gps_heading != None):
            print("ANTENNA MODE: GPS, heading of " + str(round(gps_heading["headingDegrees"], 2)))
            status = 1
            angle = gps_heading["headingDegrees"]
        else:
            print("ANTENNA: GPS DATA IS NULL")
            status = 0
            angle = 0
    else:
        print("ANTENNA ERROR")
        status = 0
        angle = 0
    try:
        adjustedAngle = int(angle * 100)
        status_hex = status.to_bytes(1, 'big', signed=True).hex()
        angle_hex = adjustedAngle.to_bytes(3, byteorder="little", signed=True).hex()
        can_msg = (
                f't{IDs["SEND_ANGLE"]}4'
                f'{status_hex}{angle_hex}\r'
            )
        await asyncio.to_thread(serial_ports["antenna"]["port"].write, can_msg.encode())
    except Exception as e:
            print(f'Error in antenna command: {e}')

def register_antenna_events(sio, serial_ports, gps_heading):
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
        await antennasend(serial_ports, gps_heading)
        return "OK"
    


    @sio.event
    async def setAntennaSettings(sid, payload):
        antennadata.txon = payload["txon"]
        antennadata.mode = payload["mode"]
        antennadata.manualAngle=int(payload["manualAngle"])
        print("ANTENNA SETTINGS SYNCED")
        return "OK"