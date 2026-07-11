import socketio
import uvicorn
import metrics
import asyncio
import signal
from metrics import asyncsshloop, register_metric_events, cpuloop, send_fake_antenna_stats
from gps import ZEDF9P, read_gps_data, send_fake_gps_data
from shutdown import register_shutdown_commands
import sys


# run python 3 py_server.py --offline to send fake data instead for ssh
offline = "--offline" in sys.argv
if (offline):
    print("Offline mode enabled, using mock data instead")
else:
    print("Online mode, SSH ready... ")


serial_ports = {
    "gps": None,
    "gpsId" : "disconnect",
}

# GPS_AUTO_PORT = "/dev/ttyACM0"
GPS_AUTO_PORT = "COM9" 


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
        if serial_ports["gps"]:
            serial_ports["gps"].close()
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

# async def main():
#     async with socketio.AsyncSimpleClient() as rsio:
#         try:
#             await rsio.connect('http://localhost:4000')
#             print('Connected, my sid is', rsio.sid)
#         except:
#             print("Failed to connect.")

# asyncio.run(main())

# =================== GPS connections ===================
@sio.event
async def autoConnectGPS(sid=None, retry_delay=2): 
    global serial_ports
    while serial_ports["gpsId"] == "disconnect":
        try:
            print("Auto-connecting to GPS: {GPS_AUTO_PORT}...")
            serial_ports["gps"] = ZEDF9P(GPS_AUTO_PORT, 57600)
            serial_ports["gpsId"] = GPS_AUTO_PORT
            print("GPS auto-connected successfully.")
            return("OK")
        except Exception as e:
            print(f"GPS not available on {GPS_AUTO_PORT} yet: {e}")
            await asyncio.sleep(retry_delay)

# =================== Initialization ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
arm_task_started = False
gps_task_started = False
gps_auto_connect_started = False
async_ssh_started = False
cpu_started = False


register_metric_events(sio)
register_shutdown_commands(sio)
# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    global async_ssh_started
    global cpu_started
    global gps_task_started
    global gps_auto_connect_started
    global numClients
    # Ensure we log connection and keep metrics' client count in sync
    print(f"Client connected (py_server): {sid}")
    try:
        metrics.numClients += 1
    except Exception:
        pass

    # Start background loop once
    if not async_ssh_started:
        async_ssh_started = True
        if offline:
            sio.start_background_task(send_fake_antenna_stats,sio,"900MHZ")
            sio.start_background_task(send_fake_antenna_stats,sio,"5GHZ")
        else:
            sio.start_background_task(asyncsshloop, sio, "900MHZ")
            sio.start_background_task(asyncsshloop, sio, "5GHZ")
    if not gps_auto_connect_started and not offline:
        gps_auto_connect_started = True
        sio.start_background_task(autoConnectGPS)
    if not gps_task_started:
        gps_task_started = True
        if offline:
            sio.start_background_task(send_fake_gps_data, sio)
        else:
            sio.start_background_task(read_gps_data, serial_ports, sio)
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
