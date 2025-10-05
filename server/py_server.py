import serial
import time
import socketio
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler

ID = {
    "SET_CHASSIS_VELOCITIES": '00C',
    "SET_VELOCITIES_RESPONSE": '00D',
    "HEARTBEAT": '00E',
    "HEARTBEAT_REPLY": '00F',
    "HOMING_SEQUENCE": '100',
    "HOMING_SEQUENCE_RESPONSE": '111',
    "GET_OFFSET": '112',
    "RETURN_OFFSET": '113',
    "GET_ESTIMATED_VELOCITIES": '114',
    "RETURN_ESTIMATED_CHASSIS_VELOCITIES": '115',
    "CONFIG": '119'
}


sio = socketio.Server(cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

driveSerial = serial.Serial('/dev/ttyACM0', 115200,rtscts=False,dsrdtr=False)

driveSerial.dtr = False
driveSerial.rts = False

print(driveSerial.dtr)
print(driveSerial.rts)
time.sleep(0.2)
driveSerial.dtr = True
driveSerial.rts = False

print(driveSerial.dtr)
print(driveSerial.rts)
time.sleep(0.2)
driveSerial.dtr = False
driveSerial.rts = False

print(driveSerial.dtr)
print(driveSerial.rts)
time.sleep(0.2)

driveSerial.write(('\r\r\r\r').encode())
time.sleep(0.2)
driveSerial.write(('V\r').encode())
time.sleep(0.2)
driveSerial.write(('S8\r').encode())
time.sleep(0.2)
driveSerial.write(('O\r').encode())
time.sleep(0.2)
@sio.event
def connect(sid, environ):
    print('connect ', sid)

@sio.event
def driveCommands(sid, data):
    pass

@sio.event
def driveHoming(sid):
    driveSerial.write((f"t{ID['HOMING_SEQUENCE']}80000000000000000\r").encode())

WSGIServer(('localhost', 4000), app,handler_class=WebSocketHandler ).serve_forever()
