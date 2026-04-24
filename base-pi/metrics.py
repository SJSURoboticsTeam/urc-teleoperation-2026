
import asyncssh
from dotenv import load_dotenv
import os
import asyncio
import psutil
import random
from pathlib import Path

#-----------------------#
# User Config
silenceSSHErrors = False
AntennaPollingRate = 2
RpiPollingRate = 2

# [antenna] : ip, socketio topic name
antennadata = {
    "900MHZ": {"ip": "192.168.1.20", "topic": "antennastats900"},
    "5GHZ": {"ip": "192.168.5.30", "topic": "antennastats5"}
}
#-----------------------#


# get data from secrets
load_dotenv()  # loads from .env
username = os.getenv("SSH_USER")
password = os.getenv("SSH_PASSWORD")


# var initialization
numClients = 0


async def cpuloop(sio):
    while True:
        try:
            #print("Testing metrics.")
            cpu_percent = psutil.cpu_percent(interval=1)
            ram = psutil.virtual_memory() # returns -->  (total, available, percent, used, free, active, inactive, buffers, cached, shared, slab)
            
            model_path = Path("/proc/device-tree/model")
            temp = -1 # placeholder, but returned if run on non-pi
            try:
                # check if server is on rpi, and if so ask hardware for temp
                if "Raspberry Pi" in model_path.read_text(errors="ignore").strip("\x00"):
                    with open("/sys/class/thermal/thermal_zone0/temp") as f:
                        temp = int(f.read()) / 1000.0
            except:
                pass
                # print("No RPI found, using dev mode ignore")

            data = {
                'status': "GOOD",
                'cpupercent': cpu_percent,
                'rampercent': ram[2], # we want the percent, see comment above for full info set
                'cputemp': temp,
            }
            await sio.emit('cpustats', data)
        except Exception as e:
            print("Error with metrics!", e)
            await sio.emit('pistats', {'status': "ERROR"})
        #print("Sleeping")
        await asyncio.sleep(RpiPollingRate)


async def asyncsshloop(sio, antenna):
    conn = None

    while True:
        if not username:
            await sio.emit('antennastats', {'status': "ERROR: NO SSH CREDS"})
            await asyncio.sleep(1)
            continue

        try:
            # ensure connection (reuse if possible)
            if conn is None:
                async with asyncio.timeout(10):
                    conn = await asyncssh.connect(
                        antennadata[antenna]["ip"], # from the array, find the antenna, get its ip
                        username=username,
                        password=password,
                    )
            # single command to reduce round-trips
            async with asyncio.timeout(10):
                res = await conn.run(
                    "mca-status | grep -E 'signal|wlanTxRate|wlanRxRate|centerFreq|chanbw|noise|wlanPollingCapacity'",
                    check=False
                )

            parsed = {}
            for line in res.stdout.splitlines():
                if '=' in line:
                    k, v = line.split('=', 1)
                    parsed[k.strip()] = v.strip()

            data = {
                'status': "GOOD",
                'dbm': parsed.get('signal'),
                'txrate': parsed.get('wlanTxRate'),
                'rxrate': parsed.get('wlanRxRate'),
                'freq': parsed.get('centerFreq'),
                'freqwidth': parsed.get('chanbw'),
                'noise': parsed.get('noise'),
                "efficiency" : parsed.get('wlanPollingCapacity')
            }

            await sio.emit(antennadata[antenna]["topic"], data)

        except Exception as e:
            if not silenceSSHErrors:
                print("SSH error:", e)

            await sio.emit('antennastats', {'status': "ERROR: OFFLINE"})

            # reset connection and back off slightly
            if conn is not None:
                conn.close()
                await conn.wait_closed()
                conn = None

        await asyncio.sleep(AntennaPollingRate)



# function to generate and send fake data, pass in --offline flag to server to use
async def send_fake_antenna_stats(sio,antenna):
    while True:
        if (antenna == "900MHZ"):
            data = {
                'status': "GOOD", # Reports good if link is successful
                'dbm': random.randint(-100, -45),             # signal strength
                'txrate': round(random.uniform(1, 7), 1),  # Mbps
                'rxrate': round(random.uniform(1, 7), 1),  # Mbps
                'freq': random.choice([904, 914, 924]),   # MHz
                'freqwidth': random.choice([3, 5, 8, 20]),
                'noise': random.randint(-100, -70),          # dBm
                'efficiency': round(random.uniform(0, 100), 2)  # %
            }
        else:
            data = {
                'status': "GOOD", # Reports good if link is successful
                'dbm': random.randint(-75, -30),             # signal strength
                'txrate': round(random.uniform(20, 60), 1),  # Mbps
                'rxrate': round(random.uniform(20, 60), 1),  # Mbps
                'freq': random.choice([5800, 5820, 5840]),   # MHz
                'freqwidth': random.choice([10, 20, 40, 80]),
                'noise': random.randint(-100, -70),          # dBm
                'efficiency': round(random.uniform(0, 100), 2)  # %
            }
        # antennadata[antenna]["topic"] is the topic name
        await sio.emit(antennadata[antenna]["topic"], data)
        await asyncio.sleep(AntennaPollingRate)



def register_metric_events(sio):
    """Register metrics-related socket.io handlers.

    `sio` is expected to be a `socketio.AsyncServer` (async handlers are supported).
    """
    global numClients

    @sio.event
    async def getConnections(sid):
        return numClients

    @sio.event
    async def pingCheck(sid):
        #unlike the others ping works better as a query and respond than otherwise
        return 1