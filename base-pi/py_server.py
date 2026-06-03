import socketio
import uvicorn
import metrics
import asyncio
import signal
from metrics import asyncsshloop, register_metric_events, cpuloop, send_fake_antenna_stats
from gps import ZEDF9P, read_gps_data, send_fake_gps_data
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
        return("OK")
    except Exception as e:
        print("FAILURE TO CONNECT GPS: " + str(e))
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
            return("OK")
        else:
            print("GPS was never connected.")
            return("ERROR")
    except Exception:
        print("GPS WAS NOT DISCONNECTED!!!")
        return("ERROR")
        pass

# =================== Initialization ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
arm_task_started = False
gps_task_started = False
async_ssh_started = False
cpu_started = False


register_metric_events(sio)
# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    global async_ssh_started
    global cpu_started
    global gps_task_started
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
