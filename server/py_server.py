from can_serial import CanSerial
from gps import ZEDF9P
import threading
import socketio
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler
import math

ID = {
    "SET_CHASSIS_VELOCITIES": '00C',
    "SET_VELOCITIES_RESPONSE": '00D',
    "HEARTBEAT": '00E',
    "HEARTBEAT_REPLY": '00F',
    "HOMING_SEQUENCE": '110',
    "HOMING_SEQUENCE_RESPONSE": '111',
    "GET_OFFSET": '112',
    "RETURN_OFFSET": '113',
    "GET_ESTIMATED_VELOCITIES": '114',
    "RETURN_ESTIMATED_CHASSIS_VELOCITIES": '115',
    "CONFIG": '119'
}


sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

drive_serial = CanSerial('/dev/ttyACM0')

gps_module = ZEDF9P("/dev/tty.usbmodem14201", 57600)

@sio.event
def connect(sid, environ):
    print('connect ', sid)

@sio.event
def driveCommands(sid, data):
    x_vel = int(data['xVel']).to_bytes(2, 'big', signed=True).hex()
    y_vel = int(data['yVel']).to_bytes(2, 'big', signed=True).hex()
    rot_vel = int(data['rotVel']).to_bytes(2, 'big', signed=True).hex()
    drive_serial.write(f"t{ID['SET_CHASSIS_VELOCITIES']}6{x_vel}{y_vel}{rot_vel}\r")

@sio.event
def driveHoming(sid):
    drive_serial.write((f"t{ID['HOMING_SEQUENCE']}80000000000000000\r").encode())

def parse_data(data):

    string_data = data.decode()

    if len(string_data) < 5:
        return
    address = string_data[1:4]

    if address == ID['SET_VELOCITIES_RESPONSE']:
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
    
    elif address == ID['HEARTBEAT_REPLY']:
        print("Heartbeat Reply")

    elif address == ID['HOMING_SEQUENCE_RESPONSE']:
        print("Homing Reply")

    elif address == ID['RETURN_OFFSET']:
        angle_offset = int(string_data[5:13],16)
        print(f"angle offset: {angle_offset} \nmodule position: {string_data[13:15]}")

    elif address == ID['RETURN_ESTIMATED_CHASSIS_VELOCITIES']:
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
    
    elif address == ID['CONFIG']:
        setting_data = int(string_data[5:13],16)
        print(f"setting data: {setting_data} \nsetting ID: {string_data[13:15]}")
    

    

def parse_can_inputs():
    while (True):
        parse_data(drive_serial.read_can(None))

def read_gps_data():
    while (True):
        if gps_module.has_gps_lock():
        position = gps_module.get_position

# Server Emits
# sio.emit('my event', {'data': 'foobar'})
# sio.emit('my event', {'data': 'foobar'}, to=user_sid) # to specified client
# response = sio.call('my event', {'data': 'foobar'}, to=user_sid) # waits for client to acknowledge
sio.emit('gpsData', {})
    
can_thread = threading.Thread(target=parse_can_inputs)

can_thread.start()

WSGIServer(('localhost', 4000), app,handler_class=WebSocketHandler ).serve_forever()
