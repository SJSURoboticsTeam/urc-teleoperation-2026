from can_serial import CanSerial
import socketio
import uvicorn
import metrics
import asyncio
import signal
import sys
from metrics import asyncsshloop, cpuloop, register_metric_events
from drive import read_drive_can_loop, send_drive_status_request, register_drive_events
from arm import read_arm_can_loop, register_arm_events
from camera_pt import register_camera_pt_events

# =================== Clean Shutdown ===================
# tell python how to shutdown the program cleanly
signal.signal(signal.SIGINT, lambda s, f: shutdown())
signal.signal(signal.SIGTERM, lambda s, f: shutdown())
shutting_down = False

def shutdown():
    # both the SIGINT and SIGTERM may both call the shutdown at the same time and run twice.
    # checking makes it run only once
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    print("\nShutting down... ")
    try:
        if drive_serial:
            drive_serial.close()
            print("Drive serial closed.")
        else:
            print("Drive was never connected.")
    except Exception:
        print("DRIVE WAS NOT DISCONNECTED!!!")
        pass
    try:
        if arm_serial:
            arm_serial.close()
            print("Arm serial closed.")
        else:
            print("Arm was never connected.")
    except Exception:
        print("ARM WAS NOT DISCONNECTED!!!")
        pass
    sys.exit(0)
# =================== Setup, CAN connections ===================

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*',allow_upgrades=True)
#uncomment to use the debug admin ui
# sio.instrument(auth={
#     'username': 'admin',
#     'password': 'admin',
# })
app = socketio.ASGIApp(sio)

# CAN buses
print("Preparing for CAN...")
drive_serial = None
arm_serial = None
try:
    # RX TESTER /dev/tty.usbserial-59760082211
    # ROBOT /dev/tty.usbserial-59760073491
    drive_serial = CanSerial('/dev/tty.usbserial-59760082211')
    print("Drive connected.")
except Exception as e:
    print("FAILURE TO CONNECT DRIVE: " + str(e))
try:
    arm_serial = CanSerial('/dev/tty.usbserial-59760073211')
    print("Arm connected.")
except Exception as e:
    print("FAILURE TO CONNECT ARM!" + str(e))




# =================== Initialization ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
arm_task_started = False
async_ssh_started = False
cpu_started = False


register_metric_events(sio)
register_drive_events(sio,drive_serial)
register_arm_events(sio, arm_serial)
register_camera_pt_events(sio,drive_serial)

# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    """On first client connect, start background CAN read loop."""
    global can_error_message_started
    global drive_task_started
    global arm_task_started
    global async_ssh_started
    global cpu_started
    global numClients
    # Ensure we log connection and keep metrics' client count in sync
    print(f"Client connected (py_server): {sid}")
    try:
        metrics.numClients += 1
    except Exception:
        pass

    # Start background CAN loop once
    if not drive_task_started:
        drive_task_started = True
        sio.start_background_task(read_drive_can_loop,drive_serial)
    if not arm_task_started:
        arm_task_started = True
        sio.start_background_task(read_arm_can_loop, arm_serial)
    if not can_error_message_started:
        can_error_message_started = True
        sio.start_background_task(send_drive_status_request,drive_serial)
    if not async_ssh_started:
       async_ssh_started = True
       #sio.start_background_task(asyncsshloop,sio)
    if not cpu_started:
        cpu_started = True
        #sio.start_background_task(cpuloop,sio)


@sio.event
async def disconnect(sid):
    print(f'Client disconnected: {sid}')
    metrics.numClients -= 1


config = uvicorn.Config(
    app,
    host="0.0.0.0",
    port=4000,
    log_level="warning",
)
server = uvicorn.Server(config)
try:
    print("Server Starting...")
    server.run()
finally:
    shutdown()
