import asyncio

# Track Servo Address: 0x120 
# Shoulder Servo Address: 0x121,
# Elbow Servo Address: 0x122,
# Wrist EF1 Servo Address: 0x123,
# Wrist EF2 Servo Address: 0x124,
# Clamp Servo Address: 0x125

# Receive = Servo Address + 0x100
arm_send_ID = {
    "STOP": '00C',
    "HEARTBEAT": '00E',
    "HOMING_SEQUENCE": '111',
    # Will handle set and read servo position and velocity
    # PID (send in case defaults are wrong) when getting pid constants, if the defaults are not good, we can callibrate
    "TRACK": '120',
    "SHOULDER": '121',
    "ELBOW": '122',
    "WRIST_EF1": '123',
    "WRIST_EF2": '124',
    "CLAMP": '125',
}

arm_receive_ID = {
    "RECEIVE_STOP": "00D",
    # Heartbeat response, Homing response, return ack, position, velocity, PID acks
    "TRACK": '220',
    "SHOULDER": '221',
    "ELBOW": '222',
    "WRIST_EF1": '223',
    "WRIST_EF2": '224',
    "CLAMP": '225',
}

# =================== ARM CAN Data Parsing & Emit =======================
arm_parse_functions = {
    arm_receive_ID['RECEIVE_STOP']: lambda _: parse_receive_stop(),
    arm_receive_ID['TRACK']:        lambda data: parse_arm_servo(data),
    arm_receive_ID['ELBOW']:        lambda data: parse_arm_servo(data),
    arm_receive_ID['WRIST_EF1']:    lambda data: parse_arm_servo(data),
    arm_receive_ID['WRIST_EF2']:    lambda data: parse_arm_servo(data),
    arm_receive_ID['CLAMP']:        lambda data: parse_arm_servo(data)
}

def register_arm_events(sio, arm_serial):
    @sio.event
    async def armCommands(sid, data):
        # 8 bit signed integer correlating to 2^6x
        shoulder_scaled = int(data['shoulder'] * (2**6))
        elbow_scaled = int(data['elbow'] * (2**6))
        pitch_scaled = int(data['pitch'] * (2**6))
        roll_scaled = int(data['roll'] * (2**6))
        track_scaled = int(data['track'] * (2**6))
        clamp_scaled = int(data['clamp'] * (2**6))

        shoulder = shoulder_scaled.to_bytes(2, 'big', signed=True).hex()
        elbow = elbow_scaled.to_bytes(2, 'big', signed=True).hex()
        pitch = pitch_scaled.to_bytes(2, 'big', signed=True).hex()
        roll = roll_scaled.to_bytes(2, 'big', signed=True).hex()
        track = track_scaled.to_bytes(2, 'big', signed=True).hex()
        clamp = clamp_scaled.to_bytes(2, 'big', signed=True).hex()

        can_msg = f't{arm_send_ID["ELBOW"]}312{elbow}\r'
        await asyncio.to_thread(arm_serial.write, can_msg.encode())
        
        # can_msg = f't{arm_send_ID["SHOULDER"]}312{shoulder}\r'
        # await asyncio.to_thread(arm_serial.write, can_msg.encode())
        
        # can_msg = f't{arm_send_ID["TRACK"]}312{track}\r'
        # await asyncio.to_thread(arm_serial.write, can_msg.encode())

        print(f'[{sid}] Arm command sent: {can_msg}')

def parse_receive_stop():
    print("Received Arm Stop")

def parse_arm_servo(data):

    address_map = {
        "220": 'Track',
        "221": 'Shoulder',
        "222": 'Elbow',
        "223": 'Wrist EF1',
        "224": 'Wrist EF2',
        "225": 'Clamp'
    }

    print(f'{address_map[data[1:4]]} servo position set reply')

def parse_arm_data(data):
    try:
        string_data = data.decode()
        print(string_data)
        if len(string_data) < 5:
            return

        address = string_data[1:4]
        arm_parse_functions[address](data)
    except Exception as e:
        print(f'Error parsing arm data: {e}')

async def read_arm_can_loop(arm_serial):
    try:
        while True:
            # data = arm_serial.read_can(None)
            data = await asyncio.to_thread(arm_serial.read_can, None)
            if data:
                parse_arm_data(data)
            # time.sleep(0.01)
            await asyncio.sleep(0.01)
    except Exception as e:
        print(f'Arm CAN thread error: {e}')