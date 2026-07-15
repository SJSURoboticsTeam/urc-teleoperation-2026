import socketio
import uvicorn
import metrics
import asyncio
import signal
from metrics import asyncsshloop, register_metric_events, cpuloop, send_fake_antenna_stats
from shutdown import register_shutdown_commands
import sys, subprocess


print("\033[0m----------------")

# Get commit hash and message
commit_result = subprocess.run(['git', 'log', '-1', '--pretty=format:%h %s'], capture_output=True, text=True)
if commit_result.returncode != 0:
    print("Failed to retrieve Git commit information.")
else:
    short_hash, message = commit_result.stdout.strip().split(' ', 1)

    # Get current branch
    branch_result = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], capture_output=True, text=True)
    if branch_result.returncode != 0:
        branch = "unknown"
    else:
        branch = branch_result.stdout.strip()

    # Format output with color and branch info
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




# =================== Initialization ===================
# Background task guard
can_error_message_started = False
drive_task_started = False
arm_task_started = False
async_ssh_started = False
cpu_started = False


register_metric_events(sio)
register_shutdown_commands(sio)
# =================== Start Server ===================

@sio.event
async def connect(sid,environ):
    global async_ssh_started
    global cpu_started
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
