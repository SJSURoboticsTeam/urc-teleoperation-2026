import socketio
import time
from gpiozero import Button

SERVER_URL = "http://localhost:4000"
EVENT = "estop"

sio = socketio.Client(reconnection=True, reconnection_delay=1)
