# Arm CAN module
# Handles:
# - sending arm joint commands (manual + AUTO TX)
# - parsing CAN responses from firmware
# - optional filtering for joint-by-joint testing
# - emitting feedback to frontend

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

RECEIVE_ID_TO_JOINT = {
    "220": "track",
    "221": "shoulder",
    "222": "elbow",
    "223": "pitch",
    "224": "roll",
    "225": "clamp",
}

# Optional temporary test filter for hardware bring-up
# Limits which joints are actually sent to CAN
# Ex: {"track"}, {"shoulder"}, {"elbow"}, {"pitch"}, {"roll"}, {"clamp"}
# Set to None to send all joints normally
ARM_TEST_JOINTS = None

def should_send_joint(joint_name):
    return ARM_TEST_JOINTS is None or joint_name in ARM_TEST_JOINTS

def encode_arm_value(value):
    """
    Firmware expects fixed-point values scaled by 2^6
    """
    try:
        scaled = int(float(value) * (2 ** 6))
        print(
            f"[ARM DEBUG] raw={value}, scaled={scaled}, "
            f"hex={scaled.to_bytes(2, 'big', signed=True).hex()}"
        )
    except Exception:
        scaled = 0

    return scaled.to_bytes(2, "big", signed=True).hex()

def decode_canusb_frame(data):
    """
    Parse CANUSB / SLCAN-style frame:
      t + 3-char CAN ID + 1-char DLC + payload bytes as hex

    Examples:
      t222162
      t222870F3800000000000
    """
    try:
        string_data = data.decode().strip()

        if not string_data or string_data[0] != "t":
            return None

        if len(string_data) < 5:
            return None

        can_id = string_data[1:4]
        dlc = int(string_data[4], 16)
        payload_hex = string_data[5:]
        payload_bytes = bytes.fromhex(payload_hex) if payload_hex else b""

        return {
            "frame": string_data,
            "id": can_id,
            "dlc": dlc,
            "payload_hex": payload_hex,
            "payload_bytes": payload_bytes,
        }

    except Exception as e:
        print(f"[ARM RX] Failed to decode frame: {e}")
        return None
    
async def send_arm_joint(serial_ports, joint_name, value):
    """
    Send a single joint set-position command over CAN

    Firmware doc:
      Set Servo Position:
      ID = servo address
      Len = 3
      Data[0] = 0x12
      Data[1:2] = position bytes
    """
    arm_serial = serial_ports.get("arm")
    if arm_serial is None:
        print(f"[ARM] {joint_name} ignored: arm not connected")
        return False

    if joint_name not in JOINT_TO_CAN_KEY:
        print(f"[ARM] Unknown joint: {joint_name}")
        return False

    payload = encode_arm_value(value)
    can_key = JOINT_TO_CAN_KEY[joint_name]
    can_msg = f"t{arm_send_ID[can_key]}312{payload}\r"

    try:
        print(f"[ARM] {joint_name}: {can_msg.strip()}")
        await asyncio.to_thread(arm_serial.write, can_msg.encode())
        return True
    except Exception as e:
        print(f"[ARM] {joint_name} send failed: {e}")
        return False
    
async def request_arm_joint_position(serial_ports, joint_name):
    """
    Send a read-position request over CAN

    Firmware doc:
      Read Servo Position:
      ID = servo address
      Len = 1
      Data[0] = 0x20
    """
    arm_serial = serial_ports.get("arm")
    if arm_serial is None:
        return False

    if joint_name not in JOINT_TO_CAN_KEY:
        print(f"[ARM] Unknown joint for read request: {joint_name}")
        return False

    can_key = JOINT_TO_CAN_KEY[joint_name]
    can_msg = f"t{arm_send_ID[can_key]}120\r"

    try:
        await asyncio.to_thread(arm_serial.write, can_msg.encode())
        return True
    except Exception as e:
        print(f"[ARM] {joint_name} read request failed: {e}")
        return False

def parse_receive_stop():
    print("[ARM] Received stop ACK")
    return None

def parse_arm_ack(frame_info):
    """
    ACK for set-position command.

    Firmware doc:
      Return ACK
      ID = servo address + 0x100
      Len = 1
      Data[0] = 0x12 + 0x50 = 0x62
    """
    joint_name = RECEIVE_ID_TO_JOINT.get(frame_info["id"], "unknown")
    payload = frame_info["payload_bytes"]

    if frame_info["dlc"] == 1 and len(payload) >= 1 and payload[0] == 0x62:
        print(f"[ARM ACK] {joint_name}: set-position ACK -> {frame_info['frame']}")
        return {
            "type": "ack",
            "joint": joint_name,
            "frame": frame_info["frame"],
        }

    print(f"[ARM RX] {joint_name}: unexpected short reply -> {frame_info['frame']}")
    return None


def parse_arm_position_response(frame_info):
    """
    Position response.

    Firmware doc:
      Return Servo Position
      ID = servo address + 0x100
      Len = 8
      Data[0] = 0x20 + 0x50 = 0x70
      Data[1] = position[0]
      Data[2] = position[1]
    """
    joint_name = RECEIVE_ID_TO_JOINT.get(frame_info["id"], "unknown")
    payload = frame_info["payload_bytes"]

    if frame_info["dlc"] != 8 or len(payload) < 3:
        print(f"[ARM RX] {joint_name}: invalid position frame -> {frame_info['frame']}")
        return None

    if payload[0] != 0x70:
        print(f"[ARM RX] {joint_name}: unexpected 8-byte frame -> {frame_info['frame']}")
        return None

    position_raw = int.from_bytes(payload[1:3], byteorder="big", signed=True)
    position_approx = position_raw / 64.0

    print(
        f"[ARM RX] {joint_name} raw={position_raw}, "
        f"approx={position_approx}, frame={frame_info['frame']}"
    )

    return {
        "type": "position",
        "joint": joint_name,
        "raw": position_raw,
        "approx": position_approx,
        "frame": frame_info["frame"],
    }


def parse_arm_data(data):
    """
    Route incoming CAN frame to the appropriate parser.
    """
    frame_info = decode_canusb_frame(data)
    if frame_info is None:
        return None

    can_id = frame_info["id"]

    if can_id == arm_receive_ID["RECEIVE_STOP"]:
        return parse_receive_stop()

    if can_id in RECEIVE_ID_TO_JOINT:
        if frame_info["dlc"] == 1:
            return parse_arm_ack(frame_info)

        if frame_info["dlc"] == 8:
            return parse_arm_position_response(frame_info)

        print(f"[ARM RX] Unhandled servo frame -> {frame_info['frame']}")
        return None

    # Ignore unrelated CAN traffic for now
    return None

def register_arm_events(sio, serial_ports):
    @sio.event
    async def armCommands(sid, data):
        """
        MANUAL TX: send all joints from one payload
        """
        if serial_ports.get("arm") is None:
            print(f"[{sid}] armCommands ignored: arm not connected")
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
        """
        AUTO TX: send only the updated joint
        """
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

    @sio.event
    async def armReadPosition(sid, data):
        """
        Optional explicit read-position request from frontend or test tools.
        Expects: { "joint": "elbow" }
        """
        if serial_ports.get("arm") is None:
            print(f"[{sid}] armReadPosition ignored: arm not connected")
            return "ERROR"

        joint_name = data.get("joint")
        if not joint_name:
            return "ERROR"

        ok = await request_arm_joint_position(serial_ports, joint_name)
        return "OK" if ok else "ERROR"

async def request_arm_position_loop(serial_ports):
    """
    Periodically request servo position for all enabled joints

    Firmware doc:
      Read Servo Position
      ID = servo address
      Len = 1
      Data[0] = 0x20
    """
    joint_order = ["track", "shoulder", "elbow", "pitch", "roll", "clamp"]

    while True:
        try:
            arm_serial = serial_ports.get("arm")

            if arm_serial is None:
                await asyncio.sleep(0.1)
                continue

            for joint_name in joint_order:
                if not should_send_joint(joint_name):
                    continue

                await request_arm_joint_position(serial_ports, joint_name)
                await asyncio.sleep(0.01)

            await asyncio.sleep(0.1)

        except Exception as e:
            print(f"[ARM] position request loop error: {e}")
            await asyncio.sleep(0.25)

async def read_arm_can_loop(serial_ports, sio):
    """
    Background task that continuously reads CAN data from the arm.
    Parses responses and emits position feedback to frontend.
    """
    while True:
        try:
            arm_serial = serial_ports.get("arm")

            # Keep the read loop alive even when the arm is disconnected
            if arm_serial is None:
                await asyncio.sleep(0.1)
                continue

            data = await asyncio.to_thread(arm_serial.read_can, None)
            if data:
                parsed = parse_arm_data(data)

                if isinstance(parsed, dict) and parsed.get("type") == "position":
                    await sio.emit("armFeedback", parsed)

            # time.sleep(0.01)
            await asyncio.sleep(0.01)

        except Exception as e:
            print(f"Arm CAN thread error: {e}")
            await asyncio.sleep(0.25)
            