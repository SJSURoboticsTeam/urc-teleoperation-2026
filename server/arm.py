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
    arm_receive_ID['SHOULDER']:     lambda data: parse_arm_servo(data),
    arm_receive_ID['ELBOW']:        lambda data: parse_arm_servo(data),
    arm_receive_ID['WRIST_EF1']:    lambda data: parse_arm_servo(data),
    arm_receive_ID['WRIST_EF2']:    lambda data: parse_arm_servo(data),
    arm_receive_ID['CLAMP']:        lambda data: parse_arm_servo(data)
}

JOINT_TO_CAN_KEY = {
    "track": "TRACK",
    "shoulder": "SHOULDER",
    "elbow": "ELBOW",
    "pitch": "WRIST_EF1",
    "roll": "WRIST_EF2",
    "clamp": "CLAMP",
}

# Optional temporary test filter for hardware bring-up
# Ex: {"track"}, {"shoulder"}, {"elbow"}, {"pitch"}, {"roll"}, {"clamp"}
# Leave as None to send all joints normally
ARM_TEST_JOINTS = None

def should_send_joint(joint_name):
    return ARM_TEST_JOINTS is None or joint_name in ARM_TEST_JOINTS

def encode_arm_value(value):
    try:
        scaled = int(float(value))  # send raw degrees or mm
    except Exception:
        scaled = 0
    return scaled.to_bytes(2, "big", signed=True).hex()

async def send_arm_joint(serial_ports, joint_name, value):
    arm_serial = serial_ports.get("arm")
    if arm_serial is None:
        print(f'[ARM] {joint_name} ignored: arm not connected')
        return False

    if joint_name not in JOINT_TO_CAN_KEY:
        print(f'[ARM] Unknown joint: {joint_name}')
        return False

    payload = encode_arm_value(value)
    can_key = JOINT_TO_CAN_KEY[joint_name]
    can_msg = f't{arm_send_ID[can_key]}312{payload}\r'

    try:
        print(f'[ARM] {joint_name}: {can_msg}')
        await asyncio.to_thread(arm_serial.write, can_msg.encode())
        return True
    except Exception as e:
        print(f'[ARM] {joint_name} send failed: {e}')
        return False

def register_arm_events(sio, serial_ports):
    @sio.event
    async def armCommands(sid, data):
        # Manual/full send path: send all joints from one payload
        if serial_ports.get("arm") is None:
            print(f'[{sid}] armCommands ignored: arm not connected')
            return "ERROR"
        
        print(f"[{sid}] armCommands payload: {data}")

        joint_order = ["track", "shoulder", "elbow", "pitch", "roll", "clamp"]

        for joint_name in joint_order:
            if not should_send_joint(joint_name):
                continue

            value = data.get(joint_name, 0)
            ok = await send_arm_joint(serial_ports, joint_name, value)
            if not ok:
                return "ERROR"

        print(f"[{sid}] armCommands sent successfully")
        return "OK"

    @sio.event
    async def armJointCommand(sid, data):
        # AUTO TX path: send only the updated joint
        if serial_ports.get("arm") is None:
            print(f"[{sid}] armJointCommand ignored: arm not connected")
            return "ERROR"

        joint_name = data.get("joint")
        value = data.get("value", 0)

        print(f"[{sid}] armJointCommand payload: {data}")

        if not should_send_joint(joint_name):
            print(f"[{sid}] armJointCommand skipped by test filter: {joint_name}")
            return "OK"

        ok = await send_arm_joint(serial_ports, joint_name, value)
        return "OK" if ok else "ERROR"

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
        if address in arm_parse_functions:
            arm_parse_functions[address](data)
    except Exception as e:
        print(f'Error parsing arm data: {e}')

async def read_arm_can_loop(serial_ports):
    while True:
        try:
            arm_serial = serial_ports.get("arm")
            # Keep the read loop alive even when the arm is disconnected
            if arm_serial is None:
                await asyncio.sleep(0.1)
                continue

            data = await asyncio.to_thread(arm_serial.read_can, None)
            if data:
                parse_arm_data(data)

            # time.sleep(0.01)
            await asyncio.sleep(0.01)
        except Exception as e:
            print(f'Arm CAN thread error: {e}')
            await asyncio.sleep(0.25)
            