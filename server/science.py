from can_serial import CanSerial
import metrics, config
import asyncio
import socketio
import math
import time
import uvicorn
# from metrics import asyncsshloop, cpuloop

science_send_ID = {
    "STEP": '0x130',
    "HEARTBEAT": '0x00',
    "DRILL": '0x132',
    "COLOR_SENSOR_FIN": '0x34',
    "PRESSURE_HUMIDITY_TEMPERATURE_SENSOR_FIN": '0x35'
}
science_receive_ID = {
    "FINISHED_STEP": '0x30',
    "HEARTBEAK_ACK": "0x01",
    "DRILL_START_ACK": "0x32",
    "DRILL_FINISH": "0x33",
    "COLOR_SENSOR_DATA": '0x234',
    "PRESSURE_HUMIDITY_TEMPERATURE_SENSOR_DATA": '0x235'
}
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*',allow_upgrades=True)
#uncomment to use admin ui
#sio.instrument(auth={
#    'username': 'admin',
#    'password': 'admin',
#})
app = socketio.ASGIApp(sio)
