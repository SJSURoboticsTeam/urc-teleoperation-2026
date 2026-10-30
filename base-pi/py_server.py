from can_serial import CanSerial
from serial.tools import list_ports
import socketio
import uvicorn
import metrics
import asyncio
import signal
import os
import sys

from metrics import asyncsshloop, register_metric_events, cpuloop, send_fake_antenna_stats
from gps import ZEDF9P, read_gps_data, send_fake_gps_data
from shutdown import register_shutdown_commands
from video import send_fake_video_stats, videoloop
import sys, subprocess


print("\033[0m----------------")
serial_ports = {
    "antenna": {"port": None, "id": "disconnect", "status_event": asyncio.Event(), "lock": asyncio.Lock()},
    "gps": {"port": None, "id": "disconnect", "lock": asyncio.Lock()},
}
gps_state = {"robot": None}

GPS_AUTO_ID = "1546:01A9"


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


# run python 3 py_server.py --offline to send fake data instead for ssh
offline = "--offline" in sys.argv
if (offline):
    print("\033[92mOffline mode enabled, using mock data instead")
else:
    print("\033[92mOnline mode, SSH ready... ")

print("\033[0m----------------")




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
    #gps
    try:
        if serial_ports["gps"]["port"]:
            serial_ports["gps"]["port"].close()
            print("GPS serial closed.")
        else:
            print("GPS was never connected.")
    except Exception:
        print("GPS WAS NOT DISCONNECTED!!!")
        pass
    sys.exit(0)
# =================== Server Setup ===================

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*',allow_upgrades=True)
#uncomment to use the debug admin ui
# sio.instrument(auth={
#     'username': 'admin',
#     'password': 'admin',
# })
app = socketio.ASGIApp(sio)

# =================== Robot Client Setup ===================

if offline:
    ROBOT_SERVER_URL = os.environ.get("ROBOT_SERVER_URL", "http://localhost:4000")
else:
    ROBOT_SERVER_URL = os.environ.get("ROBOT_SERVER_URL", "http://192.168.1.49:4000")

async def robot_server_loop():
    while not shutting_down:
        robot = socketio.AsyncClient()

        @robot.on("gpsData")
        async def receive_robot_gps(data):
            if data.get("latitude") is not None and data.get("longitude") is not None:
                gps_state["robot"] = {
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                }

        try:
            await robot.connect(ROBOT_SERVER_URL, wait_timeout=5)
            print(f"Connected to robot server at {ROBOT_SERVER_URL}")
            await robot.wait()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"Robot server connection failed: {exc}")
        finally:
            gps_state["robot"] = None
            if robot.connected:
                await robot.disconnect()
        if not shutting_down:
            await asyncio.sleep(5)

# =================== GPS connections ===================
@sio.event
async def getCanInfo(sid):
    """Returns all the CAN ids to the frontend after filtering"""

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
    'antennaId' : serial_ports["antenna"]["id"],
    'gpsId' : serial_ports["gps"]["id"],
    }
    return data


@sio.event
async def connectBasePeripheral(sid, line, id):
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
            if line == "gps":
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
async def disconnectBasePeripheral(sid, line):
    """Wait for pending setup before disconnecting the peripheral."""
    if line not in serial_ports:
        return "ERROR"
    print("Disconnecting " + line )

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


# =================== Initialization ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
arm_task_started = False
gps_task_started = False
robot_gps_task_started = False
async_ssh_started = False
cpu_started = False
video_task_started = False


register_metric_events(sio)
register_shutdown_commands(sio)
# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    global async_ssh_started
    global cpu_started
    global gps_task_started
    global robot_gps_task_started
    global numClients
    global video_task_started
    # Ensure we log connection and keep metrics' client count in sync
    print(f"Client connected (py_server): {sid}")
    try:
        metrics.numClients += 1
    except Exception:
        pass

    # Start background loop once
    if not robot_gps_task_started:
        robot_gps_task_started = True
        sio.start_background_task(robot_server_loop)

    if not async_ssh_started:
        async_ssh_started = True
        if offline:
            sio.start_background_task(send_fake_antenna_stats,sio,"900MHZ")
            sio.start_background_task(send_fake_antenna_stats,sio,"5GHZ")
        else:
            sio.start_background_task(asyncsshloop, sio, "900MHZ")
            sio.start_background_task(asyncsshloop, sio, "5GHZ")
    if not gps_task_started:
        gps_task_started = True
        if offline:
            sio.start_background_task(send_fake_gps_data, sio, gps_state)
        else:
            sio.start_background_task(read_gps_data, serial_ports, sio, gps_state)
    if not cpu_started:
        cpu_started = True
        sio.start_background_task(cpuloop,sio)
    if not video_task_started:
        video_task_started = True
        if offline:
            sio.start_background_task(send_fake_video_stats, sio)
        else:
            sio.start_background_task(videoloop, sio)


@sio.event
async def disconnect(sid):
    print(f'Client disconnected: {sid}')
    metrics.numClients -= 1


config = uvicorn.Config(
    app,
    host="0.0.0.0",
    port=4001,
    log_level="warning",
)
server = uvicorn.Server(config)
try:
    # THIS PRINT STATEMENT IS EXPECTED FOR TESTS TO PASS
    print("Server Starting...")
    server.run()
finally:
    shutdown()
