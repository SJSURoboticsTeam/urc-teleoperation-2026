from can_serial import CanSerial
import metrics
import socketio
import uvicorn
from metrics import asyncsshloop, cpuloop
from drive import read_drive_can_loop, send_drive_status_request


sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*',allow_upgrades=True)
#uncomment to use the debug admin ui
#sio.instrument(auth={
#    'username': 'admin',
#    'password': 'admin',
#})
app = socketio.ASGIApp(sio)

# CAN buses
print("Starting...")
try:
    # RX TESTER /dev/tty.usbserial-59760082211
    # ROBOT /dev/tty.usbserial-59760073491
    drive_serial = CanSerial('/dev/tty.usbserial-59760082211')
    print("Drive connected.")
except Exception as e:
    print("FAILURE TO CONNECT DRIVE: " + str(e))
# try:
#     arm_serial = CanSerial('/dev/ttyACM1')
#     print("Arm connected.")
# except Exception as e:
#     print("FAILURE TO CONNECT ARM!" + str(e))


# =================== Metrics Event Handlers ====================
# metrics.register_metrics(sio)

# =================== Background Threads ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
async_ssh_started = False
cpu_started = False
can_msg_count = 0




# =================== Start Threads ===================
# The drive CAN loop will be started as a background task when the first client connects


# arm_thread = threading.Thread(target=read_arm_can_loop, daemon=True)
# arm_thread.start()

# =================== Start Server ===================
print("Server Starting...")

@sio.event
async def connect(sid, environ):
    """On first client connect, start background CAN read loop."""
    global can_error_message_started
    global drive_task_started
    # global async_ssh_started
    global cpu_started
    # Ensure we log connection and keep metrics' client count in sync
    print(f"Client connected (py_server): {sid}")
    try:
        metrics.numClients += 1
    except Exception:
        pass

    # Start background CAN loop once
    if not drive_task_started:
        drive_task_started = True
        sio.start_background_task(read_drive_can_loop)
    if not can_error_message_started:
        can_error_message_started = True
        sio.start_background_task(send_drive_status_request)
    # if not async_ssh_started:
    #     async_ssh_started = True
    #     sio.start_background_task(asyncsshloop,sio)
    # if not cpu_started:
    #     cpu_started = True
    #     sio.start_background_task(cpuloop,sio)


@sio.event
async def disconnect(sid):
    global numClients
    print(f'Client disconnected: {sid}')
    metrics.numClients -= 1


uvicorn.run(app, host='0.0.0.0', port=4000, log_level="warning")
print("Server Started!")
