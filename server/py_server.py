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
from arm import read_arm_can_loop, request_arm_position_loop, register_arm_events, send_arm_status_request
from camera_pt import register_camera_pt_events
from autonomy import get_autonomy_states
from gps import ZEDF9P, GPS_Data, GNRMC, read_gps_data, send_fake_gps_data
from arm import dump_session_log
from shutdown import register_shutdown_commands
from serial_console import SerialConsole, register_serial_console_events
from drive_control import register_drive_control_events, release_drive_control
from battery import send_fake_battery_data, get_battery_data
from soft_stop import is_soft_stopped, set_soft_stop


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
    print("Autonomy integration enabled")
else:
    print("Autonomy integration disabled")

# initialize e-stop
estop_pin = None
try:
    # silence 5-lines of spammed GPIO warnings for non-PI devices
    import warnings
    from gpiozero.exc import BadPinFactory, PinFactoryFallback
    warnings.filterwarnings("ignore", category=PinFactoryFallback)
    # initialize the GPIO pin
    from gpiozero import DigitalOutputDevice
    # We are using GPIO pin 26 on a RPI 5, conviently at the bottom right of the pi next to a ground pin
    # see https://pinout.xyz/pinout/pin37_gpio26/ for more details
    estop_pin = DigitalOutputDevice(26, initial_value=False)
    print("GPIO e-stop is online.\033[0m")
except BadPinFactory:
    print("GPIO e-stop disabled\033[0m")


print("----------------")

serial_ports = {
    "drive": {"port": None, "id": "disconnect", "status_event": asyncio.Event(), "lock": asyncio.Lock()},
    "arm": {"port": None, "id": "disconnect", "status_event": asyncio.Event(), "lock": asyncio.Lock()},
    "science": {"port": None, "id": "disconnect", "status_event": asyncio.Event(), "lock": asyncio.Lock()},
    "gps": {"port": None, "id": "disconnect", "status_event": asyncio.Event(), "lock": asyncio.Lock()},
}
serial_console = SerialConsole()



# =================== Clean Shutdown ===================
# tell python how to shutdown the program cleanly
signal.signal(signal.SIGINT, lambda s, f: shutdown())
signal.signal(signal.SIGTERM, lambda s, f: shutdown())
shutting_down = False

def shutdown():
    """Global server shutdown code"""
    # both the SIGINT and SIGTERM may both call the shutdown at the same time and run twice.
    # checking makes it run only once
    global shutting_down
    if shutting_down:
        return
    shutting_down = True
    serial_console.close()
    print("Shutting down... ")
    # shut down all the ids
    ids = ["drive", "arm", "science", "gps"]
    for id in ids:
        try:
            if serial_ports[id]["port"]:
                serial_ports[id]["port"].close()
                print(id.capitalize() + " serial closed.")
            else:
                print(id.capitalize() + " was never connected.")
        except Exception:
            print(id.upper() + " WAS NOT DISCONNECTED!!!")
            pass
    # e-stop
    try:
        estop_pin.close()
    except:
        print("estop_pin wasn't closed")
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
    """Returns all the CAN ids to the frontend after filtering"""
    uart_str = "CAN"
    if USE_UART_DRIVE:
        uart_str = "UART"

    # can ids for web ui
    canIds_arr = []
    for port in list_ports.comports():
        print(f"{port.device} ")

        if( (port.device.find("serial") != -1) or (port.device.find("COM")) != -1 or (port.device.find("tty") != -1) or (port.device.find("modem") != -1) ):
            # loose check to remove system serial interfaces
            canIds_arr.append(port.device)

    data = {
    'status': "OK",
    'canIds' : canIds_arr,
    'driveId' : serial_ports["drive"]["id"],
    'armId' : serial_ports["arm"]["id"],
    'scienceId' : serial_ports["science"]["id"],
    'gpsId' : serial_ports["gps"]["id"],
    "uartMode" : uart_str,
    }
    return data

@sio.event
async def connectRoverPeripheral(sid, line, id):
    """Initialize serial hardware off the event loop, then publish the connection."""
    if line not in serial_ports:
        return "ERROR"

    # Setup yields to other handlers; serialize changes to this peripheral.
    async with serial_ports[line]["lock"]:
        if serial_ports[line]["id"] != "disconnect":
            print(line.upper() + " WAS ALREADY CONNECTED!")
            return "ERROR"
        print("Connecting " + line + " to " + str(id))
        try:
            if USE_UART_DRIVE and line == "drive":
                port = await asyncio.to_thread(UartDriveSerial, id)
            elif line == "gps":
                port = await asyncio.to_thread(ZEDF9P, id, 57600)
            else:
                port = await asyncio.to_thread(CanSerial, id)

            serial_ports[line]["port"] = port
            serial_ports[line]["id"] = id
            await sio.emit("forcecanrefresh", skip_sid=sid)
            return "OK"
        except Exception as e:
            print("FAILURE TO CONNECT " + line.upper() + ": " + str(e))
            await sio.emit("forcecanrefresh", skip_sid=sid)
            return "ERROR"


@sio.event
async def disconnectRoverPeripheral(sid, line):
    """Wait for pending setup before disconnecting the peripheral."""
    if line not in serial_ports:
        return "ERROR"
    print("Disconnecting " + line)

    async with serial_ports[line]["lock"]:
        port = serial_ports[line]["port"]
        # Detach before yielding so background tasks stop using the old port.
        serial_ports[line]["port"] = None
        serial_ports[line]["id"] = "disconnect"
        try:
            if port is not None:
                await asyncio.to_thread(port.close)
            await sio.emit("forcecanrefresh", skip_sid=sid)
            return "OK"
        except Exception as e:
            print("FAILURE TO DISCONNECT " + line.upper() + ": " + str(e))
            await sio.emit("forcecanrefresh", skip_sid=sid)
            return "ERROR"


@sio.event
async def E_STOP(sid):
    """When recieved from frontend, pulse pin 26 high, this killing all power"""
    print("----------------")
    print("E-STOP TRIGGERED")
    print("----------------")
    try:
        if estop_pin is not None:
            estop_pin.on()
        else:
            print("\033[91mNo physical e-stop present!\033[0m")
    except Exception as exc:
        print(f"\033[91mPhysical e-stop activation failed: {exc}\033[0m")
        # wait 200ms for message to come back, then stop
    asyncio.get_event_loop().call_later(1, shutdown)
    return("OK")
    

# =================== Initialization ===================
# Background task guard
can_error_message_started_drive = False
can_error_message_started_arm = False
drive_task_started = False
drive_heartbeat_started = False
arm_task_started = False
gps_task_started = False
arm_position_task_started = False
async_ssh_started = False
cpu_started = False
# this lock ensures that only one function can be sending on the drive can/uart line at once
drive_command_lock = asyncio.Lock()
autonomy_started = False
battery_started = False


async def _send_drive_stop_command():
    """Write a zero-velocity command to the drive line. Caller must hold drive_command_lock."""
    if not serial_ports["drive"]:
        print("No drive serial connected. Cannot send stop command.")
        return
    try:
        if USE_UART_DRIVE:
            await send_uart_drive_command(serial_ports, 0, 0, 0, 0)
            print("UART: Sent stop command to drive motors.")
        else:
            await send_can_drive_command(serial_ports, 0, 0, 0, 0)
            print("CAN: Sent stop command to drive motors.")
    except Exception as e:
        print(f"Failed to send stop command: {e}")


async def stop_drive_motors():
    """Send stop command to drive motors for safety when no clients are connected"""
    async with drive_command_lock:
        # A client may have reconnected while this task was waiting for the lock.
        if metrics.numClients != 0:
            return
        await _send_drive_stop_command()


async def stop_drive_motors_for_handover():
    """Send stop command during a drive-control handover, regardless of client count"""
    async with drive_command_lock:
        await _send_drive_stop_command()


register_metric_events(sio)
if USE_UART_DRIVE:
    register_uart_drive_events(sio, serial_ports, drive_command_lock)
else:
    register_can_drive_events(sio, serial_ports, drive_command_lock)
register_arm_events(sio, serial_ports)
register_camera_pt_events(sio,serial_ports)
register_shutdown_commands(sio)
register_serial_console_events(sio, serial_console)
register_drive_control_events(sio, stop_drive_motors_for_handover)

# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    """Event code when a client connects, many startup functions trigger here"""
    global can_error_message_started_drive
    global can_error_message_started_arm
    global drive_task_started
    global drive_heartbeat_started
    global arm_task_started
    global gps_task_started
    global async_ssh_started
    global arm_position_task_started
    global cpu_started
    global numClients
    global autonomy_started
    global battery_started
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
        if not can_error_message_started_drive:
            can_error_message_started_drive = True
            sio.start_background_task(send_drive_status_request, serial_ports,sio)
    if not can_error_message_started_arm:
        can_error_message_started_arm = True
        sio.start_background_task(send_arm_status_request, serial_ports, sio)
    if not async_ssh_started:
       async_ssh_started = True
       #sio.start_background_task(asyncsshloop,sio)
    if not cpu_started:
        cpu_started = True
        sio.start_background_task(cpuloop,sio)
    if (not autonomy_started) and autonomy:
        autonomy_started = True
        sio.start_background_task(get_autonomy_states,sio)
    if not battery_started:
        battery_started = True
        if offline:
            sio.start_background_task(send_fake_battery_data, sio)
        else:
            sio.start_background_task(get_battery_data, sio)

    # Sync a newly-connecting client to the current Soft Stop state
    await set_soft_stop(sio, is_soft_stopped(), sid=sid)

@sio.event
async def softStop(sid):  # function name  == event name (sid  = client session id)
    """Operator-triggered pause: lock controls, and zero drive velocity if drive is connected"""
    if serial_ports["drive"]:
        async with drive_command_lock:
            try:
                if USE_UART_DRIVE:
                    await send_uart_drive_command(serial_ports, 0, 0, 0, 0)
                else:
                    await send_can_drive_command(serial_ports, 0, 0, 0, 0)
                print(f'[{sid}] Soft Stop triggered - drive velocity zeroed.')
            except Exception as e:
                print(f'Failed to send Soft Stop drive command: {e}')
    else:
        print(f'[{sid}] Soft Stop triggered - drive not connected, locking controls only.')

    # Broadcast to every connected client so they all lock, not just the sender
    await set_soft_stop(sio, True)

    # Always acknowledge: locking out Drive/Arm/Science doesn't depend on
    # drive specifically being connected.
    return "OK"


@sio.event
async def resumeControls(sid):
    """Acknowledge the frontend unlocking controls after a Soft Stop"""
    print(f'[{sid}] Controls resumed after Soft Stop.')
    await set_soft_stop(sio, False)
    return "OK"


@sio.event
async def disconnect(sid):
    """Event code when a client disconnects"""
    print(f'Client disconnected: {sid}')

    metrics.numClients = max(0, metrics.numClients - 1)

    await release_drive_control(sio, stop_drive_motors_for_handover, sid)

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
