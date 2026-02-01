
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

def parse_arm_data(data):
    try:
        payload = {"armStatus": "example"}
        sio.emit('armUpdate', payload)
    except Exception as e:
        print(f'Error parsing armr data: {e}')


def read_arm_can_loop():
    try:
        while True:
            data = arm_serial.read_can(None)
            if data:
                parse_arm_data(data)
            time.sleep(0.01)
    except Exception as e:
        print(f'Arm CAN thread error: {e}')


def register_arm_events(sio):

