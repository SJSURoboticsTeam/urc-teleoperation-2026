from can_serial import CanSerial
from serial.tools import list_ports
import socketio
import uvicorn
import metrics
import asyncio
import signal
import sys
import subprocess
from metrics import cpuloop, register_metric_events
from drive import (
    read_drive_can_loop,
    register_drive_events as register_can_drive_events,
    send_drive_command as send_can_drive_command,
    send_drive_status_request,
)
from uart_drive_serial import UartDriveSerial
from drive_uart import (
    read_drive_uart_loop,
    register_drive_events as register_uart_drive_events,
    send_drive_command as send_uart_drive_command,
    send_drive_heartbeat,
)
from arm import read_arm_can_loop, request_arm_position_loop, register_arm_events
from camera_pt import register_camera_pt_events
from autonomy import get_autonomy_states
from gps import ZEDF9P, GPS_Data, GNRMC, read_gps_data, send_fake_gps_data
from arm import dump_session_log
from shutdown import register_shutdown_commands
from serial_console import SerialConsole, register_serial_console_events

print("\033[0m----------------")

short_hash = "unknown"
message = ""
branch = "unknown"

try:
    commit_result = subprocess.run(
        ["git", "log", "-1", "--pretty=format:%h %s"],
        capture_output=True,
        text=True,
    )

    if commit_result.returncode == 0:
        short_hash, _, message = commit_result.stdout.strip().partition(" ")

    branch_result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
    )

    if branch_result.returncode == 0:
        branch = branch_result.stdout.strip()

except OSError:
    pass

print(f"\033[1m\033[94m[{short_hash}] [{branch}] {message}\033[0m")

# Toggle drive communication transport for testing / fallback
# True = UART drive path
# False = original CAN drive path
USE_UART_DRIVE = False
print("\033[92mUART_DRIVE: " + str(USE_UART_DRIVE))

# run python 3 py_server.py --offline to send fake data instead for ssh
offline = "--offline" in sys.argv
if (offline):
    print("Offline mode enabled, using mock data instead")
else:
    print("Online mode, GPS ready... ")

autonomy = "--autonomy" in sys.argv
if (autonomy):
    print("Autonomy integration enabled\033[0m")
else:
    print("Autonomy integration disabled\033[0m")


print("----------------")
serial_ports = {
    "drive": None,
    "driveId" : "disconnect",
    "arm": None,
    "armId" : "disconnect",
    "gps": None,
    "gpsId" : "disconnect",
    "science": None,
    "scienceId" : "disconnect"
}
serial_console = SerialConsole()



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
    serial_console.close()
    print("----------------")
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
    #gps
    try:
        if serial_ports["gps"]:
            serial_ports["gps"].close()
            print("GPS serial closed.")
        else:
            print("GPS was never connected.")
    except Exception:
        print("GPS WAS NOT DISCONNECTED!!!")
        pass

    try:
        dump_session_log() # saves arm_session.log on exit
    except OSError as exc:
        print(f"[ARM] Failed to save session log: {exc}")
    finally:
        sys.exit(0)
# =================== Setup, CAN connections ===================

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    allow_upgrades=True,
    ping_interval=1,
    ping_timeout=3,
)
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
    uart_str = "CAN"
    if USE_UART_DRIVE:
        uart_str = "UART"

    # can ids for web ui
    canIds_arr = []
    for port in list_ports.comports():
        print(f"{port.device} ")

        if( (port.device.find("serial") != -1) or (port.device.find("COM")) != -1 or (port.device.find("tty") != -1) ):
            # loose check to remove system serial interfaces
            canIds_arr.append(port.device)

    data = {
    'status': "OK",
    'canIds' : canIds_arr,
    'driveId' : serial_ports["driveId"],
    'armId' : serial_ports["armId"],
    'scienceId' : serial_ports["scienceId"],
    'gpsId' : serial_ports["gpsId"],
    "uartMode" : uart_str,
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
        # Use UART as a backup / alternative to CAN for drive communication
        if USE_UART_DRIVE:
            serial_ports["drive"] = UartDriveSerial(data)
            print("Drive UART connected.")
        else:
            serial_ports["drive"] = CanSerial(data)
            print("Drive CAN connected.")
            

        serial_ports["driveId"] = data
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT DRIVE: " + str(e))
        await sio.emit('forcecanrefresh', skip_sid=sid)
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
            await sio.emit('forcecanrefresh', skip_sid=sid)
            return("OK")
        else:
            print("Drive was never connected.")
            return("ERROR")
    except Exception:
        print("DRIVE WAS NOT DISCONNECTED!!!")
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return("ERROR")
        pass

@sio.event
async def connectArm(sid,data):
    # connects to can and returns OK or ERROR
    global serial_ports
    # prevent double connection
    try:
        if serial_ports["arm"] is not None:
            try:
                serial_ports["arm"].close()
            except Exception:
                pass

        serial_ports["arm"] = None
        serial_ports["armId"] = "disconnect"

        print("Connecting to " + str(data))
        serial_ports["arm"] = CanSerial(data)
        serial_ports["armId"] = data
        print("Arm connected.")
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return "OK"
    except Exception as e:
        serial_ports["arm"] = None
        serial_ports["armId"] = "disconnect"
        print("FAILURE TO CONNECT ARM: " + str(e))
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return "ERROR"

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
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return "OK"
    except Exception:
        serial_ports["arm"] = None
        serial_ports["armId"] = "disconnect"
        print("ARM WAS NOT DISCONNECTED CLEANLY!!!")
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return "ERROR"

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
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT SCIENCE: " + str(e))
        await sio.emit('forcecanrefresh', skip_sid=sid)
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
            await sio.emit('forcecanrefresh', skip_sid=sid)
            return("OK")
        else:
            print("Science was never connected.")
            return("ERROR")
    except Exception:
        print("SCIENCE WAS NOT DISCONNECTED!!!")
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return("ERROR")
        pass

# =================== GPS connections ===================
@sio.event
async def connectGPS(sid, data):
    # connect to gps serial port
    global serial_ports
    if serial_ports["gpsId"] != "disconnect":
        print("GPS WAS ALREADY CONNECTED!")
        return("ERROR")
    print("Connecting to " + str(data))
    try:
        serial_ports["gps"] = ZEDF9P(data, 57600) 
        serial_ports["gpsId"] = data
        print("GPS connected.")
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT GPS: " + str(e))
        await sio.emit('forcecanrefresh', skip_sid=sid)
        return("ERROR")

@sio.event
async def disconnectGPS(sid):
    global serial_ports
    try:
        if serial_ports["gps"]:
            serial_ports["gps"].close()
            serial_ports["gps"] = None
            serial_ports["gpsId"] = "disconnect"
            print("GPS serial closed.")
            await sio.emit('forcecanrefresh', skip_sid=sid)
            return("OK")
        else:
            print("GPS was never connected.")
            return("ERROR")
    except Exception:
        print("GPS WAS NOT DISCONNECTED!!!")
        await sio.emit('forcecanrefresh', skip_sid=sid)
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
drive_heartbeat_started = False
arm_task_started = False
gps_task_started = False
arm_position_task_started = False
async_ssh_started = False
cpu_started = False
# this lock ensures that only one function can be sending on the drive can/uart line at once
drive_command_lock = asyncio.Lock()
autonomy_started= False


register_metric_events(sio)
if USE_UART_DRIVE:
    register_uart_drive_events(sio, serial_ports, drive_command_lock)
else:
    register_can_drive_events(sio, serial_ports, drive_command_lock)
register_arm_events(sio, serial_ports)
register_camera_pt_events(sio,serial_ports)
register_shutdown_commands(sio)
register_serial_console_events(sio, serial_console)

# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    """On first client connect, start background CAN read loop."""
    global can_error_message_started
    global drive_task_started
    global drive_heartbeat_started
    global arm_task_started
    global gps_task_started
    global async_ssh_started
    global arm_position_task_started
    global cpu_started
    global numClients
    global autonomy_started
    # Ensure we log connection and keep metrics' client count in sync
    print(f"Client connected (py_server): {sid}")
    try:
        metrics.numClients += 1
    except Exception:
        pass

    # Start background CAN loop once
    if not drive_task_started:
        # Start either UART or CAN drive loop depending on selected transport
        drive_task_started = True
        if USE_UART_DRIVE:
            sio.start_background_task(read_drive_uart_loop, serial_ports)
        else:
            sio.start_background_task(read_drive_can_loop, serial_ports)
    if not arm_task_started:
        arm_task_started = True
        sio.start_background_task(read_arm_can_loop, serial_ports, sio)
    if not arm_position_task_started:
        arm_position_task_started = True
        # sio.start_background_task(request_arm_position_loop, serial_ports)
    if not gps_task_started:
        gps_task_started = True
        if offline:
            sio.start_background_task(send_fake_gps_data, sio)
        else:
            sio.start_background_task(read_gps_data, serial_ports, sio)
    # UART drive path uses heartbeat instead of CANUSB status polling
    if USE_UART_DRIVE:
        if not drive_heartbeat_started:
            drive_heartbeat_started = True
            sio.start_background_task(send_drive_heartbeat, serial_ports)
    else:
        if not can_error_message_started:
            can_error_message_started = True
            sio.start_background_task(send_drive_status_request, serial_ports)
    if not async_ssh_started:
       async_ssh_started = True
       #sio.start_background_task(asyncsshloop,sio)
    if not cpu_started:
        cpu_started = True
        sio.start_background_task(cpuloop,sio)
    if (not autonomy_started) and autonomy:
        autonomy_started = True
        sio.start_background_task(get_autonomy_states,sio)

async def stop_drive_motors():
    # Send stop command to drive motors for safety when no clients are connected
    async with drive_command_lock:
        # A client may have reconnected while this task was waiting for the lock.
        if metrics.numClients != 0:
            return

        if not serial_ports["drive"]:
            print("No drive serial connected. Cannot send stop command.")
            return

        try:
            if USE_UART_DRIVE:
                await send_uart_drive_command(serial_ports, 0, 0, 0, 0)
                print("UART: 0 clients connected. Sent stop command to drive motors.")
            else:
                await send_can_drive_command(serial_ports, 0, 0, 0, 0)
                print("CAN: 0 clients connected. Sent stop command to drive motors.")
        except Exception as e:
            print(f"Failed to send stop command: {e}")


@sio.event
async def disconnect(sid):
    print(f'Client disconnected: {sid}')

    metrics.numClients = max(0, metrics.numClients - 1)

    if metrics.numClients == 0:
        print("No clients, stopping motors now.")
        await stop_drive_motors()

config = uvicorn.Config(
    app,
    host="0.0.0.0",
    port=4000,
    log_level="warning",
)
server = uvicorn.Server(config)
try:
    # THIS PRINT STATEMENT IS EXPECTED FOR TESTS TO PASS
    print("Server Starting...")
    server.run()
finally:
    shutdown()
