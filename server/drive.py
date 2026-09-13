import asyncio
import config
import can_serial
import math


drive_send_ID = {
    "SET_CHASSIS_VELOCITIES": '00C',
    "HEARTBEAT": '00E',
    "HOMING_SEQUENCE": '110',
    "GET_OFFSET": '112',
    "GET_ESTIMATED_VELOCITIES": '114',
    "CONFIG": '119',
    "SET_MAST_GIMBAL_OFFSET": '300',
}

drive_receive_ID = {
    "SET_VELOCITIES_RESPONSE": '00D',
    "HEARTBEAT_REPLY": '00F',
    "HOMING_SEQUENCE_RESPONSE": '111',
    "RETURN_OFFSET": '113',
    "RETURN_ESTIMATED_CHASSIS_VELOCITIES": '115',
    "CONFIG_ACK": '11A',
}
can_msg_count = 0


async def send_drive_command(serial_ports, x_vel, y_vel, rot_vel, module_conflicts):
    """Encode and send a chassis velocity command over CAN."""
    # 16 bit signed integer correlating to the velocity in 2^12x meters/sec
    x_vel_scaled = int(x_vel * (2 ** 12))
    y_vel_scaled = int(y_vel * (2 ** 12))

    # 16 bit signed integer correlating to the clockwise rotational velocity in 2^6x degrees/sec
    rot_vel_scaled = int(rot_vel * (2 ** 6))
    mod_conf_scaled = int(module_conflicts)

    # Convert to 16-bit signed hex
    x_vel_encoded = x_vel_scaled.to_bytes(2, 'big', signed=True).hex()
    y_vel_encoded = y_vel_scaled.to_bytes(2, 'big', signed=True).hex()
    rot_vel_encoded = rot_vel_scaled.to_bytes(2, 'big', signed=True).hex()
    mod_conf_encoded = mod_conf_scaled.to_bytes(1, 'big', signed=True).hex()

    can_msg = (
        f't{drive_send_ID["SET_CHASSIS_VELOCITIES"]}7'
        f'{x_vel_encoded}{y_vel_encoded}{rot_vel_encoded}{mod_conf_encoded}\r'
    )

    # serial_ports["drive"].write is blocking, run in thread
    await asyncio.to_thread(serial_ports["drive"].write, can_msg.encode())

    global can_msg_count
    can_msg_count += 1
    print("CAN MESSAGE NUMBER " + str(can_msg_count))

    return can_msg

# =================== Client Drive Event Handlers ====================

def register_drive_events(sio, serial_ports, drive_command_lock):
    @sio.event
    async def driveCommands(sid, data):
        try:
            async with drive_command_lock:
                can_msg = await send_drive_command(
                    serial_ports,
                    data['xVel'],
                    data['yVel'],
                    data['rotVel'],
                    data['moduleConflicts'],
                )
            print(f'[{sid}] Drive command sent: {can_msg}')
        except Exception as e:
            # if you are testing on a computer without serial, set the bool true to help your console
            if config.silenceSerialErrors == False:
                print(f'Error in driveCommands: {e}')

    @sio.event
    async def driveHoming(sid):
        try:
            can_msg = f't{drive_send_ID["HOMING_SEQUENCE"]}0\r'
            await asyncio.to_thread(serial_ports["drive"].write, can_msg.encode())
            print(f'[{sid}] Homing initiated')
        except Exception as e:
            print(f'Error in driveHoming: {e}')


async def parse_drive_data(data, serial_ports):
    try:
        if not data:
            return

        # CANUSB returns BELL when a command is rejected. For a transmit
        # command this commonly means the CAN transmit FIFO is full.
        if data.startswith(b"\x07"):
            print("CAN error: command rejected; possible transmit FIFO full")
            status_event = serial_ports.get("drive_status_event")
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

            status_event = serial_ports.get("drive_status_event")
            if status_event:
                status_event.set()

            return

        if len(string_data) < 5:
            return
        address = string_data[1:4]

        if address == drive_receive_ID['SET_VELOCITIES_RESPONSE']:
            x_vel = int(string_data[5:9],16)
            
            if string_data[5] in "89ABCDEF":
                x_vel = x_vel - math.pow(2, 16)

            y_vel = int(string_data[9:13],16)
            
            if string_data[9] in "89ABCDEF":
                y_vel = y_vel - math.pow(2, 16)

            rot_vel = int(string_data[13:],16)
            
            if string_data[13] in "89ABCDEF":
                rot_vel = rot_vel - math.pow(2, 16)

            print(f"\nx vel: {x_vel} \ny vel: {y_vel} \nrot vel {rot_vel}")
        
        elif address == drive_receive_ID['HEARTBEAT_REPLY']:
            print("Heartbeat Reply")

        elif address == drive_receive_ID['HOMING_SEQUENCE_RESPONSE']:
            print("Homing Reply")

        elif address == drive_receive_ID['RETURN_OFFSET']:
            angle_offset = int(string_data[5:13],16)
            print(f"angle offset: {angle_offset} \nmodule position: {string_data[13:15]}")

        elif address == drive_receive_ID['RETURN_ESTIMATED_CHASSIS_VELOCITIES']:
            x_vel = int(string_data[5:9],16)
            
            if string_data[5] in "89ABCDEF":
                x_vel = x_vel - math.pow(2, 16)

            y_vel = int(string_data[9:13],16)
            
            if string_data[9] in "89ABCDEF":
                y_vel = y_vel - math.pow(2, 16)

            rot_vel = int(string_data[13:],16)
            
            if string_data[13] in "89ABCDEF":
                rot_vel = rot_vel - math.pow(2, 16)

            print(f"est x vel: {x_vel} \nest y vel: {y_vel} \nest rot vel {rot_vel}")
        
        # elif address == drive_receive_ID['CONFIG']:
        #     setting_data = int(string_data[5:13],16)
        #     print(f"setting data: {setting_data} \nsetting ID: {string_data[13:15]}")

    except Exception as e:
        print(f'Error parsing drive data: {e}')

async def read_drive_can_loop(serial_ports):
    """Read CAN data"""
    while True:
        drive = serial_ports.get("drive")
        # The task starts when the client connects, but the drive can be
        # connected later through connectDrive.
        if drive is None or serial_ports.get("driveId") == "disconnect":
            await asyncio.sleep(0.1)
            continue
        try:
            # read_can is blocking, so run it in a thread.
            # A finite timeout prevents one incomplete/stale response from
            # blocking all later status responses forever.
            data = await asyncio.to_thread(drive.read_can, 0.5)
            if data:
                await parse_drive_data(data, serial_ports)
        except Exception as e:
            print(f"Drive CAN task error: {e}")
            await asyncio.sleep(0.1)

# Then once in a while send the F command to see if there are any errors (e.g. each 500-1000mS or if you get an error back from the CAN232). 
# If you get to many errors back after sending commands to the unit, send 2-3 [CR] to empty the buffer
async def send_drive_status_request(serial_ports):
    """Query the can bus for errors and/or being inresponsive (buffer full)"""
    active_drive = None
    timeout_logged = False

    try:
        while True:
            drive = serial_ports.get("drive")
            if drive is None or serial_ports.get("driveId") == "disconnect":
                # if no drive disconnected, try again in 5s
                await asyncio.sleep(5)
                continue

            if drive is not active_drive:
                active_drive = drive
                timeout_logged = False

            status_event = serial_ports["drive_status_event"]
            status_event.clear()
            await asyncio.to_thread(drive.write, b'F\r')

            try:
                await asyncio.wait_for(status_event.wait(), timeout=0.25)
                # if it responds in time, mark error as false
                timeout_logged = False
            except asyncio.TimeoutError:
                # log the error
                if not timeout_logged:
                    timeout_logged = True
                    print(
                        "\033[91mCAN not responding; bus full/error\033[0m"
                    )

            # The CANUSB manual recommends polling status every 500-1000 ms.
            await asyncio.sleep(0.75)
    except Exception as e:
        print(f'Read drive status flag error: {e}')
