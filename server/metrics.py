
import asyncssh
from dotenv import load_dotenv
import os
import asyncio
import config # holds config values
import psutil

numClients = 0

# since ssh creds are being used, we use a secrets file
# so make a file named ".env" and place in in the server/ dir

## 
## SSH_USER=???
## SSH_PASSWORD=???
##


## THEN PUT THIS IN YOUR ~/.ssh/config FILE ON THE SERVER
## THEN ACCEPT THE FINGERPRINTS FOR BOTH HOSTS

##Host 192.168.1.20
##    HostKeyAlgorithms +ssh-rsa
##    PubkeyAcceptedAlgorithms +ssh-rsa
##Host 192.168.1.25
##    HostKeyAlgorithms +ssh-rsa
##    PubkeyAcceptedAlgorithms +ssh-rsa


# get data from secrets
load_dotenv()  # loads from .env
username = os.getenv("SSH_USER")
password = os.getenv("SSH_PASSWORD")


async def asyncsshloop(sio):
    while True:
        if not username:
            await sio.emit('antennastats', {'status': "ERROR: NO SSH CREDS"})
            continue
        try:
            #print("Testing ssh...")
            async with asyncio.timeout(config.AntennaPollingRate):
                async with asyncssh.connect("192.168.1.25", username=username, password=password) as conn:
                    try:
                        #print("CONNECTED")
                        res = await conn.run("mca-status | grep signal", check=False)
                        dbm = res.stdout.strip()
                        res = await conn.run("mca-status | grep wlanTxRate", check=False)
                        txrate = res.stdout.strip()
                        res = await conn.run("mca-status | grep wlanRxRate", check=False)
                        rxrate = res.stdout.strip()
                        # typical frequency is 924MHz with a channel width of 8, becoming 920-928MHz
                        res = await conn.run("mca-status | grep centerFreq", check=False)
                        freq = res.stdout.strip()  # 924
                        res = await conn.run("mca-status | grep chanbw", check=False)
                        freqwidth = res.stdout.strip()  # 8
                        data = {
                            'status': "GOOD",
                            'dbm': dbm[7:],
                            'txrate': txrate[11:],
                            'rxrate': rxrate[11:],
                            'freq': freq[11:],
                            'freqwidth': freqwidth[7:]
                        }
                        await sio.emit('antennastats', data)
                    except Exception as e:
                        if (config.silenceSSHErrors == False):
                            print("ERROR RETRIEVING SSH DATA!:", e)
        except Exception as e:
            if(config.silenceSSHErrors == False):
                print("SSH connection failed:", e)
            await sio.emit('antennastats', {'status': "ERROR: OFFLINE"})
        #print("Sleeping")
        await asyncio.sleep(config.AntennaPollingRate)


async def cpuloop(sio):
    while True:
        try:
            #print("Testing metrics.")
            cpu_percent = psutil.cpu_percent(interval=1)
            ram = psutil.virtual_memory() # returns -->  (total, available, percent, used, free, active, inactive, buffers, cached, shared, slab)
            
            cputemp = -1 #PLACEHOLDER FOR NOW
            data = {
                'status': "GOOD",
                'cpupercent': cpu_percent,
                'rampercent': ram[2], # we want the percent
                'cputemp': cputemp,
            }
            await sio.emit('cpustats', data)
        except Exception as e:
            print("Error with metrics!", e)
            await sio.emit('pistats', {'status': "ERROR"})
        #print("Sleeping")
        await asyncio.sleep(config.RpiPollingRate)


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

