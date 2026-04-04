# Arm CAN module
# Handles:
# - sending arm joint commands (manual + AUTO TX)
# - parsing CAN responses from firmware
# - optional filtering for joint-by-joint testing
# - emitting feedback to frontend

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

JOINT_TO_CAN_KEY = {
    "track": "TRACK",
    "shoulder": "SHOULDER",
    "elbow": "ELBOW",
    "pitch": "WRIST_EF1",
    "roll": "WRIST_EF2",
    "clamp": "CLAMP",
}

# Optional temporary test filter for hardware bring-up
# Limits which joints are actually sent to CAN
# Ex: {"track"}, {"shoulder"}, {"elbow"}, {"pitch"}, {"roll"}, {"clamp"}
# Set to None to send all joints normally
ARM_TEST_JOINTS = None

def should_send_joint(joint_name):
    return ARM_TEST_JOINTS is None or joint_name in ARM_TEST_JOINTS

# Encode joint value into 2-byte CAN payload
# Firmware currently expects fixed-point values scaled by 2^6
def encode_arm_value(value):
    try:
        scaled = int(float(value) * (2**6)) 
        print(
            f"[ARM DEBUG] raw={value}, scaled={scaled}, "
            f"hex={scaled.to_bytes(2, 'big', signed=True).hex()}"
        )
    except Exception:
        scaled = 0
    return scaled.to_bytes(2, "big", signed=True).hex()

# Send a single joint command over CAN
# Converts joint name -> CAN ID and writes formatted CANUSB frame
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
    
def parse_receive_stop():
    print("Received Arm Stop")

# Parse incoming CAN frame for arm joint position feedback
# Extracts CAN ID, decodes payload bytes, and converts back to approximate value
def parse_arm_servo(data):
    string_data = data.decode().strip()

    address_map = {
        "220": "track",
        "221": "shoulder",
        "222": "elbow",
        "223": "pitch",
        "224": "roll",
        "225": "clamp",
    }

    can_id = string_data[1:4]
    joint_name = address_map.get(can_id, "unknown")

    try:
        # ASCII CAN frame format:
        # t + 3-char CAN ID + 1-char DLC + payload bytes as hex
        # Example: t22137004c0
        payload_hex = string_data[5:]
        payload_bytes = [payload_hex[i:i+2] for i in range(0, len(payload_hex), 2)]

        # Return-servo-position reply usually contains:
        # byte0 = reply command / ack
        # byte1 = position MSB
        # byte2 = position LSB
        if len(payload_bytes) < 3:
            print(f"[ARM RX] {joint_name}: not enough payload bytes -> {string_data}")
            return None

        position_raw = int.from_bytes(
            bytes.fromhex(payload_bytes[1] + payload_bytes[2]),
            byteorder="big",
            signed=True,
        )

        # If firmware is returning the same fixed-point style, this is a useful approximation
        position_approx = position_raw / 64.0

        print(
            f"[ARM RX] {joint_name} raw={position_raw}, "
            f"approx={position_approx}, frame={string_data}"
        )

        return {
            "joint": joint_name,
            "raw": position_raw,
            "approx": position_approx,
            "frame": string_data,
        }

    except Exception as e:
        print(f"[ARM RX] Failed to parse {joint_name} reply: {e} | frame={string_data}")
        return None

# Build mapping from CAN receive IDs to parsing handlers
# Keeps parsing logic centralized and easy to extend
def build_arm_parse_functions():
    return {
        arm_receive_ID['RECEIVE_STOP']: lambda _: parse_receive_stop(),
        arm_receive_ID['TRACK']:        lambda data: parse_arm_servo(data),
        arm_receive_ID['SHOULDER']:     lambda data: parse_arm_servo(data),
        arm_receive_ID['ELBOW']:        lambda data: parse_arm_servo(data),
        arm_receive_ID['WRIST_EF1']:    lambda data: parse_arm_servo(data),
        arm_receive_ID['WRIST_EF2']:    lambda data: parse_arm_servo(data),
        arm_receive_ID['CLAMP']:        lambda data: parse_arm_servo(data),
    }

# Route incoming CAN frame to correct parser based on CAN ID
def parse_arm_data(data, arm_parse_functions):
    try:
        string_data = data.decode().strip()
        print(string_data)

        if len(string_data) < 5:
            return None

        address = string_data[1:4]
        if address in arm_parse_functions:
            return arm_parse_functions[address](data)
        
        return None
    
    except Exception as e:
        print(f'Error parsing arm data: {e}')
        return None

# Register socket.io events for arm control:
# - armCommands: full state (manual TX)
# - armJointCommand: per-joint updates (AUTO TX)
def register_arm_events(sio, serial_ports):
    arm_parse_functions = build_arm_parse_functions()

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

# Background task that continuously reads CAN data from the arm
# Parses responses and emits feedback to frontend
# Designed to survive disconnect/reconnect
async def read_arm_can_loop(serial_ports, sio):
    arm_parse_functions = build_arm_parse_functions()

    while True:
        try:
            arm_serial = serial_ports.get("arm")

            # Keep the read loop alive even when the arm is disconnected
            if arm_serial is None:
                await asyncio.sleep(0.1)
                continue

            data = await asyncio.to_thread(arm_serial.read_can, None)
            if data:
                parsed = parse_arm_data(data, arm_parse_functions)

                if isinstance(parsed, dict) and parsed.get("joint") != "unknown":
                    await sio.emit("armFeedback", parsed)

            # time.sleep(0.01)
            await asyncio.sleep(0.01)

        except Exception as e:
            print(f'Arm CAN thread error: {e}')
            await asyncio.sleep(0.25)
            