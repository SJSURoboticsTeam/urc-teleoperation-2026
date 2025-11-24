
import asyncssh
from dotenv import load_dotenv
import os
import config

numClients = 0

# since ssh creds are being used, we use a secrets file
# so make a file named ".env" and place in in the server/ dir

## 
## SSH_USER=???
## SSH_PASSWORD=???
##
load_dotenv()  # loads from .env

username = os.getenv("SSH_USER")
password = os.getenv("SSH_PASSWORD")


async def get_rssi(hostname, username="ubnt", password=None, key_filename=None, timeout=10):
    """
    Async SSH using asyncssh to retrieve signal strength from a Ubiquiti device.

    Returns the signal string (trimmed) or None on error.
    """
    try:
        conn = await asyncssh.connect(
            hostname,
            username=username,
            password=password,
            client_keys=[key_filename] if key_filename else None,
            known_hosts=None,
        )
        try:
            result = await conn.run("mca-status | grep signal", check=False)
            if result.stderr:
                print(f"[{hostname}] Error: {result.stderr.strip()}")
                return "ERROR"
            output = result.stdout.strip()
            return output[7:] if len(output) >= 7 else output
        finally:
            conn.close()

    except Exception as e:
        if config.silenceErrorSpamming == False:
            print(f"[{hostname}] Connection failed (is the lan working???): {e}")
        return "OFFLINE"


def register_metrics(sio):
    """Register metrics-related socket.io handlers.

    `sio` is expected to be a `socketio.AsyncServer` (async handlers are supported).
    """
    global numClients

    @sio.event
    async def init(sid):
        global numClients
        numClients = 0

    @sio.event
    async def getConnections(sid):
        return numClients

    @sio.event
    async def pingCheck(sid):
        return 1

    @sio.event
    async def roverRSSI(sid):
        global username, password
        return await get_rssi("192.168.1.20", username, password)

    @sio.event
    async def baseRSSI(sid):
        global username, password
        return await get_rssi("192.168.1.25", username, password)
