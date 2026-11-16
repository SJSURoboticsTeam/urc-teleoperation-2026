import asyncio
from dataclasses import dataclass
import can_serial


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

async def read_antenna_can_loop(serial_ports):
    """Read CAN data"""
    while True:
        antenna = serial_ports["antenna"]["port"]
        # The task starts when the client connects, but the antenna can be
        # connected later through connectantenna.
        if antenna is None or serial_ports["antenna"]["id"] == "disconnect":
            await asyncio.sleep(0.1)
            continue
        try:
            # read_can is blocking, so run it in a thread.
            # A finite timeout prevents one incomplete/stale response from
            # blocking all later status responses forever.
            data = await asyncio.to_thread(antenna.read_can, 0.5)
            if data:
                await parse_antenna_data(data, serial_ports)
        except Exception as e:
            print(f"Antenna CAN task error: {e}")
            await asyncio.sleep(0.1)


async def parse_antenna_data(data, serial_ports):
    try:
        if not data:
            return
        # CANUSB returns BELL when a command is rejected. For a transmit
        # command this commonly means the CAN transmit FIFO is full.
        if data.startswith(b"\x07"):
            print("CAN error: command rejected; possible transmit FIFO full")
            status_event = serial_ports["antenna"]["status_event"]
            if status_event:
                status_event.set()
            return

        string_data = data.decode("ascii").strip()

        # Reading status flag - 8 bits of data
        if string_data.startswith("F"):
            if len(string_data) < 3:
                print(f"Invalid status response: {data!r}")
                return

            flags = int(string_data[1:3], 16)
            if flags:
                print(f"CAN status flags: 0x{flags:02X}")
                for bit_number, description in can_serial.status_flags.items():
                    if flags & (1 << bit_number):
                        print(f"CAN error bit {bit_number}: {description}")

            status_event = serial_ports["antenna"]["status_event"]
            if status_event:
                status_event.set()
            return
        if len(string_data) < 5:
            return
        address = string_data[1:4]
        if address == IDs['REPLY']:
            print("Got a message!")

    except Exception as e:
        print(f'Error parsing drive data: {e}')


    # Then once in a while send the F command to see if there are any errors (e.g. each 500-1000mS or if you get an error back from the CAN232). 
# If you get to many errors back after sending commands to the unit, send 2-3 [CR] to empty the buffer
async def send_antenna_status_request(serial_ports, sio):
    """Continuously query the CAN adapter and report outage state changes."""
    active_antenna = None
    overload_reported = False

    while True:
        antenna = serial_ports["antenna"]["port"]
        if antenna is None or serial_ports["antenna"]["id"] == "disconnect":
            active_antenna = None
            overload_reported = False
            # The antenna may be connected later, so keep the monitor alive.
            await asyncio.sleep(5)
            continue

        try:
            if antenna is not active_antenna:
                active_antenna = antenna
                overload_reported = False

            status_event = serial_ports["antenna"]["status_event"]
            status_event.clear()
            await asyncio.to_thread(antenna.write, b'F\r')

            try:
                await asyncio.wait_for(status_event.wait(), timeout=0.25)
            except asyncio.TimeoutError:
                if not overload_reported:
                    overload_reported = True
                    print(
                        "\033[91mCAN not responding; bus full/error\033[0m"
                    )
                    await sio.emit("canoverload", "antenna")
            else:
                # Emit recovery once, but continue polling because the fault can
                # return after the adapter automatically clears its buffer.
                if overload_reported:
                    overload_reported = False
                    print("\033[92mAntenna CAN responding again\033[0m")
                    await sio.emit("canoverloadclear", "antenna")
        except Exception as e:
            # A transient serial/socket failure must not kill status monitoring.
            print(f'Read antenna status flag error: {e}')

        # The CANUSB manual recommends polling status every 500-1000 ms.
        await asyncio.sleep(0.75)