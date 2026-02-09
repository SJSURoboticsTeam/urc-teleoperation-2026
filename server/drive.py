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



# =================== Client Drive Event Handlers ====================

def register_drive_events(sio,drive_serial):
    @sio.event
    async def driveCommands(sid, data):
        try:
            # 16 bit signed integer correlating to the velocity in 2^12x meters/sec
            x_vel_scaled = int(data['xVel'] * (2 ** 12))
            y_vel_scaled = int(data['yVel'] * (2 ** 12))
            
            # 16 bit signed integer correlating to the clockwise rotational velocity in 2^6x degrees/sec
            rot_vel_scaled = int(data['rotVel'] * (2 ** 6))
            mod_conf_scaled = int(data['moduleConflicts'])

            # Convert to 16-bit signed hex
            x_vel = x_vel_scaled.to_bytes(2, 'big', signed=True).hex()
            y_vel = y_vel_scaled.to_bytes(2, 'big', signed=True).hex()
            rot_vel = rot_vel_scaled.to_bytes(2, 'big', signed=True).hex()
            mod_conf = mod_conf_scaled.to_bytes(1, 'big', signed=True).hex()

            can_msg = f't{drive_send_ID["SET_CHASSIS_VELOCITIES"]}7{x_vel}{y_vel}{rot_vel}{mod_conf}\r'

            # drive_serial.write is blocking, run in thread
            await asyncio.to_thread(drive_serial.write, can_msg.encode())
            print(f'[{sid}] Drive command sent: {can_msg}')
            global can_msg_count
            can_msg_count = can_msg_count + 1
            print("CAN MESSAGE NUMBER " + str(can_msg_count))
        except Exception as e:
            # if you are testing on a computer without serial, set the bool true to help your console
            if config.silenceSerialErrors == False:
                print(f'Error in driveCommands: {e}')

    @sio.event
    async def driveHoming(sid):
        try:
            can_msg = f't{drive_send_ID["HOMING_SEQUENCE"]}0\r'
            await asyncio.to_thread(drive_serial.write, can_msg.encode())
            print(f'[{sid}] Homing initiated')
        except Exception as e:
            print(f'Error in driveHoming: {e}')


async def parse_drive_data(data):
    try:
        string_data = data.decode()

        # Reading status flag - 8 bits of data
        if string_data[0] in "F":
            # convert data into bits to parse errors
            binary_string_padded = format(int(string_data[1:3], 16), '08b')
            print(f"Error bits: {binary_string_padded}")
            for i, bit in enumerate(binary_string_padded):
                if bit == 1:
                    print(can_serial.status_flags[i])
                    match i:
                        case 6, 7:
                            can_msg = '\r\r\r\r'
                            await asyncio.to_thread(drive_serial.write, can_msg.encode())

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

async def read_drive_can_loop(drive_serial):
    try:
        while True:
            # read_can is blocking so run it in a thread
            data = await asyncio.to_thread(drive_serial.read_can, None)
            if data:
                await parse_drive_data(data)
            await asyncio.sleep(0.01)
    except Exception as e:
        print(f'Drive CAN task error: {e}')        

# Then once in a while send the F command to see if there are any errors (e.g. each 500-1000mS or if you get an error back from the CAN232). 
# If you get to many errors back after sending commands to the unit, send 2-3 [CR] to empty the buffer
async def send_drive_status_request(drive_serial):
    try:
        while True:
            can_msg = 'F\r'
            await asyncio.to_thread(drive_serial.write, can_msg.encode())
            print('Reading drive status flags')
            await asyncio.sleep(5)
            # await asyncio.sleep(1) # waiting 1000 ms
    except Exception as e:
        print(f'Read drive status flag error: {e}')        