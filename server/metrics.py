
import asyncssh
from dotenv import load_dotenv
import os
import asyncio
import config

numClients = 0

# since ssh creds are being used, we use a secrets file
# so make a file named ".env" and place in in the server/ dir

## 
## SSH_USER=???
## SSH_PASSWORD=???
##
# get data from secrets
load_dotenv()  # loads from .env
username = os.getenv("SSH_USER")
password = os.getenv("SSH_PASSWORD")


async def asyncsshloop(sio):
    print("Testing ssh...")
    async with asyncssh.connect("192.168.1.20", username=username, password=password) as conn:
        try:
            dbm = await conn.run("mca-status | grep signal", check=False).stdout.strip()
            txrate = await conn.run("mca-status | grep wlanTxRate", check=False).stdout.strip()
            # typical frequency is 924MHz with a channel width of 8, becoming 920-928MHz
            freq = await conn.run("mca-status | grep centerfreq", check=False).stdout.strip() #924
            freqwidth = await conn.run("mca-status | grep chanbw", check=False).stdout.strip() #8
            sio.emit('antennastats',{'status': 1},{'dbm': dbm[7:] }, {'txrate': txrate[7:] }, {'freq': freq[7:] }, {'freqwidth': freqwidth[7:] })
        except:
            print("Failed to connect/get info.")
            sio.emit('antennastats', {'status':-1})
    await asyncio.sleep(2)



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
        #unlike the others ping works better as a query and respond than otherwise
        return 1

