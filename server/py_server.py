from can_serial import CanSerial
from serial.tools import list_ports
import socketio
import uvicorn
import metrics
import asyncio
import signal
import sys
from metrics import cpuloop, register_metric_events
from drive import read_drive_can_loop, send_drive_status_request, register_drive_events
from arm import read_arm_can_loop, request_arm_position_loop, register_arm_events
from camera_pt import register_camera_pt_events
# ex: drive has the canserial object,
# while driveId holds the canopener name so frontend can sync with backend status
serial_ports = {
    "drive": None,
    "driveId" : "disconnect",
    "arm": None,
    "armId" : "disconnect",
    "science": None,
    "scienceId" : "disconnect"
}



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
    #drive
    try:
        if serial_ports["drive"]:
            serial_ports["drive"].close()
            print("Drive serial closed.")
        else:
            print("Drive was never connected.")
    except Exception:
        print("DRIVE WAS NOT DISCONNECTED!!!")
        pass
    #arm
    try:
        if serial_ports["arm"]:
            serial_ports["arm"].close()
            print("Arm serial closed.")
        else:
            print("Arm was never connected.")
    except Exception:
        print("ARM WAS NOT DISCONNECTED!!!")
        pass
    #science
    try:
        if serial_ports["science"]:
            serial_ports["science"].close()
            print("Science serial closed.")
        else:
            print("Science was never connected.")
    except Exception:
        print("SCIENCE WAS NOT DISCONNECTED!!!")
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


# =================== CAN connections ===================
@sio.event
async def getCanInfo(sid):
    # can ids for web ui
    canIds_arr = []
    for port in list_ports.comports():
        #print(f"{port.device} ")

        if(port.device.find("serial") != -1 or port.device.find("COM") != -1):
            # loose check to remove system serial interfaces
            canIds_arr.append(port.device)
    data = {
    'status': "OK",
    'canIds' : canIds_arr,
    'driveId' : serial_ports["driveId"],
    'armId' : serial_ports["armId"],
    'scienceId' : serial_ports["scienceId"],
    }
    return data

@sio.event
async def connectDrive(sid,data):
    # connects to can and returns OK or ERROR
    global serial_ports
    # prevent double connection
    if serial_ports["driveId"] != "disconnect":
        print("DRIVE WAS ALREADY CONNECTED!")
        return("ERROR")
    print("Connecting to " + str(data))
    try:
        serial_ports["drive"] = CanSerial(data)
        serial_ports["driveId"] = data
        print("Drive connected.")
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT DRIVE: " + str(e))
        return("ERROR")

@sio.event
async def disconnectDrive(sid):
    # disconnects can and returns OK or ERROR
    global serial_ports
    try:
        if serial_ports["drive"]:
            serial_ports["drive"].close()
            serial_ports["drive"] = None
            serial_ports["driveId"] = "disconnect"
            print("Drive serial closed.")
            return("OK")
        else:
            print("Drive was never connected.")
            return("ERROR")
    except Exception:
        print("DRIVE WAS NOT DISCONNECTED!!!")
        return("ERROR")
        pass

@sio.event
async def connectArm(sid,data):
    # connects to can and returns OK or ERROR
    global serial_ports
    # prevent double connection
    if serial_ports["armId"]!= "disconnect":
        print("ARM WAS ALREADY CONNECTED!")
        return("ERROR")
    print("Connecting to " + str(data))
    try:
        serial_ports["arm"] = CanSerial(data)
        serial_ports["armId"] = data
        print("Arm connected.")
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT DRIVE: " + str(e))
        return("ERROR")

@sio.event
async def disconnectArm(sid):
    # disconnects can and returns OK or ERROR
    global serial_ports
    try:
        if serial_ports["arm"]:
            serial_ports["arm"].close()
            serial_ports["arm"] = None
            serial_ports["armId"] = "disconnect"
            print("Arm serial closed.")
            return("OK")
        else:
            print("Arm was never connected.")
            return("ERROR")
    except Exception:
        print("ARM WAS NOT DISCONNECTED!!!")
        return("ERROR")
        pass

@sio.event
async def connectScience(sid,data):
    # connects to can and returns OK or ERROR
    global serial_ports
    # prevent double connection
    if serial_ports["scienceId"]!= "disconnect":
        print("SCIENCE WAS ALREADY CONNECTED!")
        return("ERROR")
    print("Connecting to " + str(data))
    try:
        serial_ports["science"] = CanSerial(data)
        serial_ports["scienceId"] = data
        print("Science connected.")
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT DRIVE: " + str(e))
        return("ERROR")

@sio.event
async def disconnectScience(sid):
    # disconnects can and returns OK or ERROR
    global serial_ports
    try:
        if serial_ports["science"]:
            serial_ports["science"].close()
            serial_ports["science"] = None
            serial_ports["scienceId"] = "disconnect"
            print("Science serial closed.")
            return("OK")
        else:
            print("Science was never connected.")
            return("ERROR")
    except Exception:
        print("SCIENCE WAS NOT DISCONNECTED!!!")
        return("ERROR")
        pass

@sio.event
async def E_STOP(sid):
    # shut everything down
    print("----------------")
    print("E-STOP TRIGGERED")
    print("----------------")
    # wait 200ms for message to come back, then stop
    asyncio.get_event_loop().call_later(0.2, shutdown)
    return("OK")


# =================== Initialization ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
arm_task_started = False
arm_position_task_started = False
async_ssh_started = False
cpu_started = False


register_metric_events(sio)
register_drive_events(sio,serial_ports)
register_arm_events(sio, serial_ports)
register_camera_pt_events(sio,serial_ports)

# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    """On first client connect, start background CAN read loop."""
    global can_error_message_started
    global drive_task_started
    global arm_task_started
    global arm_position_task_started
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
        sio.start_background_task(read_drive_can_loop,serial_ports)
    if not arm_task_started:
        arm_task_started = True
        sio.start_background_task(read_arm_can_loop, serial_ports, sio)
    if not arm_position_task_started:
        arm_position_task_started = True
        # sio.start_background_task(request_arm_position_loop, serial_ports)
    if not can_error_message_started:
        can_error_message_started = True
        sio.start_background_task(send_drive_status_request,serial_ports)
    if not cpu_started:
        cpu_started = True
        sio.start_background_task(cpuloop,sio)


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
