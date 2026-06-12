# Arm CAN module
# Handles:
# - sending arm joint commands (manual + AUTO TX)
# - parsing CAN responses from firmware
# - optional filtering for joint-by-joint testing
# - emitting feedback to frontend

import asyncio
import time
import datetime

_session_log = []

def log_frame(direction, raw):
    """direction: 'TX' or 'RX'"""
    _session_log.append({
        "t": datetime.datetime.now().isoformat(),
        "dir": direction,
        "raw": raw,
    })

def dump_session_log(path="arm_session.log"):
    with open(path, "w") as f:
        for entry in _session_log:
            f.write(f"{entry['t']} {entry['dir']} {entry['raw']}\n")
    print(f"[ARM] Session log saved to {path}")

ARM_DEBUG = True
ARM_DEBUG_RATE_LIMIT_SEC = 1.0

_last_arm_log_times = {}

def arm_debug_log(key, message):
    """
    Rate-limited debug logging for noisy arm TX/RX paths
    Errors should still use normal print()
    """
    if not ARM_DEBUG:
        return

    now = time.time()
    last = _last_arm_log_times.get(key, 0)

    if now - last >= ARM_DEBUG_RATE_LIMIT_SEC:
        print(message)
        _last_arm_log_times[key] = now

# Track Servo Address: 0x121 
# Shoulder Servo Address: 0x122,
# Elbow Servo Address: 0x123,
# Wrist EF1 Servo Address: 0x124,
# Wrist EF2 Servo Address: 0x125,
# Clamp Servo Address: 0x126

# Receive = Servo Address + 0x100
arm_send_ID = {
    "STOP": '00C',
    "HEARTBEAT": '00E',
    "HOMING_SEQUENCE": '111',
    # Will handle set and read servo position and velocity
    # PID (send in case defaults are wrong) when getting pid constants, if the defaults are not good, we can callibrate
    "TRACK": '121',
    "SHOULDER": '122',
    "ELBOW": '123',
    "WRIST_EF1": '124',
    "WRIST_EF2": '125',
    "CLAMP": '126',
}

arm_receive_ID = {
    # ACK is send address + 0x100 = 0x00C + 0x100 = 0x10C
    "RECEIVE_STOP": "10C",
    # Heartbeat response, Homing response, return ack, position, velocity, PID acks
    "TRACK": '221',
    "SHOULDER": '222',
    "ELBOW": '223',
    "WRIST_EF1": '224',
    "WRIST_EF2": '225',
    "CLAMP": '226',
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
    "221": "track",
    "222": "shoulder",
    "223": "elbow",
    "224": "pitch",
    "225": "roll",
    "226": "clamp",
}

# Optional temporary test filter for hardware bring-up
# Limits which joints are actually sent to CAN
# Ex: {"track"}, {"shoulder"}, {"elbow"}, {"pitch"}, {"roll"}, {"clamp"}
# Set to None to send all joints normally
ARM_TEST_JOINTS = None

def should_send_joint(joint_name):
    return ARM_TEST_JOINTS is None or joint_name in ARM_TEST_JOINTS

def invalidate_arm_connection(serial_ports, reason="unknown"):
    """
    Close and clear backend arm connection state after serial failure
    """
    try:
        arm_serial = serial_ports.get("arm")
        if arm_serial is not None:
            arm_serial.close()
    except Exception:
        pass

    serial_ports["arm"] = None
    serial_ports["armId"] = "disconnect"
    print(f"[ARM] Connection invalidated: {reason}")

# ---------------------------------------------------------------------------
# Position encoding
#
# position is a fraction of full rotation
#   fraction = degrees / 360.0   (or cm / 30.0 for track)
#   mantissa = int(fraction * 2^EXPONENT)  →  2-byte signed big-endian
#
# wire format for Set Servo Target Position (DLC=4):
#   Data[0] = 0x12
#   Data[1] = Exponent (14)
#   Data[2] = mantissa MSB
#   Data[3] = mantissa LSB
# ---------------------------------------------------------------------------
POSITION_EXPONENT = 14
POSITION_SCALE    = 2 ** POSITION_EXPONENT  # 16384

# full physical range per joint, used to convert to fraction-of-rotation
JOINT_FULL_RANGE = {
    "track":    30.0,   # cm
    "shoulder": 360.0,  # deg
    "elbow":    360.0,
    "pitch":    360.0,
    "roll":     360.0,
    "clamp":    360.0,
}

def encode_arm_value(value, joint_name="unknown"):
    """
    Encode a physical joint value into the 3-byte payload for Data[1..3]
    Returns a 6-char hex string: EE HHHH (exponent byte + 2-byte mantissa)
    The full Data field sent on wire is: 0x12 + this output
    """
    try:
        full_range = JOINT_FULL_RANGE.get(joint_name, 360.0)
        fraction   = float(value) / full_range
        mantissa   = int(fraction * POSITION_SCALE)
        mantissa   = max(-32768, min(32767, mantissa))  # clamp to int16

        exp_hex      = f"{POSITION_EXPONENT:02X}"
        mantissa_hex = mantissa.to_bytes(2, "big", signed=True).hex()

        arm_debug_log(
            f"encode:{joint_name}",
            f"[ARM DEBUG] {joint_name} val={value} frac={fraction:.4f} "
            f"mant={mantissa} wire={exp_hex}{mantissa_hex}",
        )
        return exp_hex + mantissa_hex

    except Exception:
        return f"{POSITION_EXPONENT:02X}0000"

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

        log_frame("RX", string_data)
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
    Send a single joint set-position command over CAN.

    PDF spec (CAN_Frames.pdf p.2) — Set Servo Target Position:
      ID      = servo address (0x12X)
      Len/DLC = 4
      Data[0] = 0x12
      Data[1] = Exponent (14)
      Data[2] = Position MSB  } 2-byte signed mantissa
      Data[3] = Position LSB  }   = (degrees/360) * 2^14

    WRIST NOTE (confirmed with firmware 2025-06-11):
      Wrist is a differential drive — both motors must be sent together.
      Pitch/roll are decomposed into motor values before sending:
        WRIST_EF1 (0x124) = pitch + roll
        WRIST_EF2 (0x125) = -pitch + roll
      This function handles one motor at a time; call send_wrist_joints()
      instead when you have both pitch and roll values available.
    """
    arm_serial = serial_ports.get("arm")
    if arm_serial is None:
        print(f"[ARM] {joint_name} ignored: arm not connected")
        return False

    if joint_name not in JOINT_TO_CAN_KEY:
        print(f"[ARM] Unknown joint: {joint_name}")
        return False

    payload = encode_arm_value(value, joint_name)
    can_key = JOINT_TO_CAN_KEY[joint_name]
    can_msg = f"t{arm_send_ID[can_key]}412{payload}\r"

    try:
        arm_debug_log(
            f"send:{joint_name}",
            f"[ARM TX] {joint_name}: {can_msg.strip()}",
        )
        log_frame("TX", can_msg.strip())
        await asyncio.to_thread(arm_serial.write, can_msg.encode())
        return True
    except Exception as e:
        print(f"[ARM] {joint_name} send failed: {e}")
        invalidate_arm_connection(serial_ports, f"send failure on {joint_name}")
        return False

async def send_wrist_joints(serial_ports, pitch, roll):
    """
    Send both wrist motors atomically using differential decomposition

    wrist is differential drive.
      WRIST_EF1 (0x124) = pitch + roll
      WRIST_EF2 (0x125) = -pitch + roll

    Always send both motors together — sending only one will produce
    unexpected combined motion since firmware applies values directly
    """
    ef1 = pitch + roll
    ef2 = -pitch + roll

    arm_debug_log(
        "wrist",
        f"[ARM TX] wrist pitch={pitch} roll={roll} → EF1={ef1} EF2={ef2}",
    )

    ok1 = await send_arm_joint(serial_ports, "pitch", ef1)
    ok2 = await send_arm_joint(serial_ports, "roll", ef2)
    print(f"[WRIST] pitch={pitch} roll={roll} → EF1={ef1} EF2={ef2}")
    return ok1 and ok2
    
async def request_arm_joint_position(serial_ports, joint_name):
    """
    Send a read-position request over CAN.

    Read Servo Position Reading:
      ID      = servo address (0x12X)
      Len/DLC = 1
      Data[0] = 0x23   (actual encoder value; 0x22 would read target position)
    """
    arm_serial = serial_ports.get("arm")
    if arm_serial is None:
        return False

    if joint_name not in JOINT_TO_CAN_KEY:
        print(f"[ARM] Unknown joint for read request: {joint_name}")
        return False

    can_key = JOINT_TO_CAN_KEY[joint_name]
    # command byte is 0x23
    can_msg = f"t{arm_send_ID[can_key]}123\r"

    try:
        await asyncio.to_thread(arm_serial.write, can_msg.encode())
        return True
    except Exception as e:
        print(f"[ARM] {joint_name} read request failed: {e}")
        invalidate_arm_connection(serial_ports, f"read request failure on {joint_name}")
        return False

def parse_receive_stop():
    print("[ARM] Received stop ACK")
    return None

def parse_arm_ack(frame_info):
    """
    ACK for set-position command

    Return ACK for 0x12:
      ID      = servo address + 0x100
      Len/DLC = 4
      Data[0] = 0x12  (echoed command byte)
      Data[1..3]      (echoed exponent + mantissa)

    echoes full frame
    """
    joint_name = RECEIVE_ID_TO_JOINT.get(frame_info["id"], "unknown")
    payload = frame_info["payload_bytes"]

    if frame_info["dlc"] == 4 and len(payload) >= 1 and payload[0] == 0x12:
        arm_debug_log(
            f"ack:{joint_name}",
            f"[ARM ACK] {joint_name}: set-position ACK -> {frame_info['frame']}",
        )
        return {
            "type": "ack",
            "joint": joint_name,
            "frame": frame_info["frame"],
        }

    print(f"[ARM RX] {joint_name}: unexpected ACK frame -> {frame_info['frame']}")
    return None


def parse_arm_position_response(frame_info):
    """
    Position reading response

    Return Servo Position Reading:
      ID      = servo address + 0x100
      Len/DLC = 4
      Data[0] = 0x23
      Data[1] = Exponent
      Data[2] = Position MSB  } 2-byte signed mantissa
      Data[3] = Position LSB  }   physical = (mantissa / 2^exponent) * full_range
    """
    joint_name = RECEIVE_ID_TO_JOINT.get(frame_info["id"], "unknown")
    payload = frame_info["payload_bytes"]

    if frame_info["dlc"] != 4 or len(payload) < 4:
        print(f"[ARM RX] {joint_name}: invalid position frame -> {frame_info['frame']}")
        return None

    if payload[0] != 0x23:
        arm_debug_log(
            f"rx_unknown:{joint_name}",
            f"[ARM RX] {joint_name}: unhandled 4-byte cmd=0x{payload[0]:02X} -> {frame_info['frame']}",
        )
        return None

    exponent     = payload[1]
    mantissa     = int.from_bytes(payload[2:4], byteorder="big", signed=True)
    fraction     = mantissa / (2 ** exponent)
    full_range   = JOINT_FULL_RANGE.get(joint_name, 360.0)
    position_approx = round(fraction * full_range, 2)

    arm_debug_log(
        f"pos:{joint_name}",
        f"[ARM RX] {joint_name} exp={exponent} mant={mantissa} "
        f"approx={position_approx}, frame={frame_info['frame']}",
    )

    return {
        "type": "position",
        "joint": joint_name,
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
        # both ACK and position are DLC=4; route by Data[0]
        if frame_info["dlc"] == 4:
            payload = frame_info["payload_bytes"]
            if payload and payload[0] == 0x12:
                return parse_arm_ack(frame_info)
            if payload and payload[0] == 0x23:
                return parse_arm_position_response(frame_info)

        print(f"[ARM RX] Unhandled servo frame -> {frame_info['frame']}")
        return None

    # Ignore unrelated CAN traffic for now
    return None

def register_arm_events(sio, serial_ports):

    # _last_wrist lives here (closure scope) so it persists across calls
    # AUTO TX sends one joint at a time, but wrist needs both motors together
    _last_wrist = {"pitch": 0.0, "roll": 0.0}

    @sio.event
    async def armCommands(sid, data):
        """
        MANUAL TX: send all joints from one payload
        """
        if serial_ports.get("arm") is None:
            print(f"[{sid}] armCommands ignored: arm not connected")
            return "ERROR"

        arm_debug_log(f"manual:{sid}", f"[{sid}] armCommands payload: {data}")

        joint_order = ["track", "shoulder", "elbow", "clamp"]  # wrist handled separately

        for joint_name in joint_order:
            if not should_send_joint(joint_name):
                continue
            value = data.get(joint_name, 0)
            ok = await send_arm_joint(serial_ports, joint_name, value)
            if not ok:
                return "ERROR"

        # wrist always sent together as a differential pair
        if should_send_joint("pitch") or should_send_joint("roll"):
            ok = await send_wrist_joints(
                serial_ports,
                data.get("pitch", 0),
                data.get("roll", 0),
            )
            if not ok:
                return "ERROR"

        arm_debug_log(f"manual_ok:{sid}", f"[{sid}] armCommands sent successfully")
        return "OK"

    @sio.event
    async def armJointCommand(sid, data):
        """
        AUTO TX: send only the updated joint
        For wrist joints, always sends both motors using last known values
        """
        if serial_ports.get("arm") is None:
            print(f"[{sid}] armJointCommand ignored: arm not connected")
            return "ERROR"

        joint_name = data.get("joint")
        value = data.get("value", 0)

        arm_debug_log(f"joint:{joint_name}", f"[{sid}] armJointCommand payload: {data}")

        if not should_send_joint(joint_name):
            print(f"[{sid}] armJointCommand skipped by test filter: {joint_name}")
            return "OK"

        if joint_name in ("pitch", "roll"):
            # update whichever changed, then send both together
            _last_wrist[joint_name] = value
            ok = await send_wrist_joints(
                serial_ports,
                _last_wrist["pitch"],
                _last_wrist["roll"],
            )
        else:
            ok = await send_arm_joint(serial_ports, joint_name, value)

        return "OK" if ok else "ERROR"

    @sio.event
    async def armReadPosition(sid, data):
        """
        Optional explicit read-position request from frontend or test tools
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

    Sends 0x23 (Read Servo Position Reading) to each servo in round-robin
    NOTE: 
    firmware is exploring auto-push on settle — this loop may be reduced or removed once that lands
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
            invalidate_arm_connection(serial_ports, "position request loop failure")
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
            invalidate_arm_connection(serial_ports, "read loop failure")
            await asyncio.sleep(0.25)
