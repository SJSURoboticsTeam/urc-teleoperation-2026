from can_serial import CanSerial
import metrics, config
import asyncio
import socketio
import math
import time
import uvicorn
from metrics import asyncsshloop

send_ID = {
    "SET_CHASSIS_VELOCITIES": '00C',
    "HEARTBEAT": '00E',
    "HOMING_SEQUENCE": '110',
    "GET_OFFSET": '112',
    "GET_ESTIMATED_VELOCITIES": '114',
    "CONFIG": '119',
    "SET_MAST_GIMBAL_OFFSET": '300',
}

receive_ID = {
    "SET_VELOCITIES_RESPONSE": '00D',
    "HEARTBEAT_REPLY": '00F',
    "HOMING_SEQUENCE_RESPONSE": '111',
    "RETURN_OFFSET": '113',
    "RETURN_ESTIMATED_CHASSIS_VELOCITIES": '115',
    "CONFIG_ACK": '11A',
}


sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*',allow_upgrades=True)
app = socketio.ASGIApp(sio)

# CAN buses
print("Starting...")
try:
    drive_serial = CanSerial('/dev/ttyAMA0')
    print("Drive connected.")
except Exception:
    print("FAILURE TO CONNECT DRIVE!")
try:
    arm_serial = CanSerial('/dev/ttyACM1')
    print("Arm connected.")
except Exception:
    print("FAILURE TO CONNECT ARM!")

# =================== Metrics Event Handlers ====================
metrics.register_metrics(sio)

# Background task guard
drive_task_started = False
async_ssh_started = False
cpu_started = False

# =================== Client Drive Event Handlers ====================
@sio.event
async def driveCommands(sid, data):
    try:
        # Equivalent RPMs into meters/sec (this will be a float)
        # Convert float * 2^12, truncate or round

        # 16 bit signed integer correlating to the velocity in 2^12x meters/sec
        x_vel_scaled = int(data['xVel'] * (2 ** 12))
        y_vel_scaled = int(data['yVel'] * (2 ** 12))
        
        # 16 bit signed integer correlating to the clockwise rotational velocity in 2^6x degrees/sec
        rot_vel_scaled = int(data['rotVel'] * (2 ** 6))
        # Convert to 16-bit signed hex
        x_vel = x_vel_scaled.to_bytes(2, 'big', signed=True).hex()
        y_vel = y_vel_scaled.to_bytes(2, 'big', signed=True).hex()
        rot_vel = rot_vel_scaled.to_bytes(2, 'big', signed=True).hex()

        can_msg = f't{send_ID["SET_CHASSIS_VELOCITIES"]}6{x_vel}{y_vel}{rot_vel}\r'
        # drive_serial.write is blocking, run in thread
        await asyncio.to_thread(drive_serial.write, can_msg.encode())
        print(f'[{sid}] Drive command sent: {can_msg}')
    except Exception as e:
        # if you are testing on a computer without serial, set the bool true to help your console
        if config.silenceSerialErrors == False:
            print(f'Error in driveCommands: {e}')

@sio.event
async def driveHoming(sid):
    try:
        can_msg = f't{send_ID["HOMING_SEQUENCE"]}80000000000000000\r'
        await asyncio.to_thread(drive_serial.write, can_msg.encode())
        print(f'[{sid}] Homing initiated')
    except Exception as e:
        print(f'Error in driveHoming: {e}')


# =================== Client Arm Event Handlers =====================


# =================== CAN Data Parsing & Emit =======================

def parse_drive_data(data):
    try:
        string_data = data.decode()

        if len(string_data) < 5:
            return
        address = string_data[1:4]

        if address == receive_ID['SET_VELOCITIES_RESPONSE']:
            x_vel = int(string_data[5:9],16)
            
            if string_data[5] in "89ABCDEF":
                x_vel = x_vel - math.pow(2, 16)

            y_vel = int(string_data[9:13],16)
            
            if string_data[9] in "89ABCDEF":
                y_vel = y_vel - math.pow(2, 16)

            rot_vel = int(string_data[13:],16)
            
            if string_data[13] in "89ABCDEF":
                rot_vel = rot_vel - math.pow(2, 16)

            print(f"x vel: {x_vel} \ny vel: {y_vel} \nrot vel {rot_vel}")
        
        elif address == receive_ID['HEARTBEAT_REPLY']:
            print("Heartbeat Reply")

        elif address == receive_ID['HOMING_SEQUENCE_RESPONSE']:
            print("Homing Reply")

        elif address == receive_ID['RETURN_OFFSET']:
            angle_offset = int(string_data[5:13],16)
            print(f"angle offset: {angle_offset} \nmodule position: {string_data[13:15]}")

        elif address == receive_ID['RETURN_ESTIMATED_CHASSIS_VELOCITIES']:
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
        
        elif address == receive_ID['CONFIG']:
            setting_data = int(string_data[5:13],16)
            print(f"setting data: {setting_data} \nsetting ID: {string_data[13:15]}")

    except Exception as e:
        print(f'Error parsing drive data: {e}')

# def parse_arm_data(data):
#     try:
#         payload = {"armStatus": "example"}
#         sio.emit('armUpdate', payload)
#     except Exception as e:
#         print(f'Error parsing armr data: {e}')

# =================== Background Threads ===================
async def read_drive_can_loop():
    try:
        while True:
            # read_can is blocking so run it in a thread
            data = await asyncio.to_thread(drive_serial.read_can, None)
            if data:
                parse_drive_data(data)
            await asyncio.sleep(0.01)
    except Exception as e:
        print(f'Drive CAN task error: {e}')

# def read_arm_can_loop():
#     try:
#         while True:
#             data = arm_serial.read_can(None)
#             if data:
#                 parse_arm_data(data)
#             time.sleep(0.01)
#     except Exception as e:
#         print(f'Arm CAN thread error: {e}')

# =================== Start Threads ===================
# The drive CAN loop will be started as a background task when the first client connects


# arm_thread = threading.Thread(target=read_arm_can_loop, daemon=True)
# arm_thread.start()

# =================== Start Server ===================
print("Server Starting...")


@sio.event
async def connect(sid, environ):
    """On first client connect, start background CAN read loop."""
    global drive_task_started
    global async_ssh_started
    global cpu_started
    # Ensure we log connection and keep metrics' client count in sync
    print(f"Client connected (py_server): {sid}")
    try:
        metrics.numClients += 1
    except Exception:
        pass

    # Start background CAN loop once
    if not drive_task_started:
        drive_task_started = True
        sio.start_background_task(read_drive_can_loop)
    if not async_ssh_started:
        async_ssh_started = True
        sio.start_background_task(asyncsshloop,sio)
    if not cpu_started:
        cpu_started = True
        sio.start_background_task(asyncsshloop,sio)
@sio.event
async def disconnect(sid):
    global numClients
    print(f'Client disconnected: {sid}')
    metrics.numClients -= 1
uvicorn.run(app, host='0.0.0.0', port=4000, log_level="warning")
print("Server Started!")
