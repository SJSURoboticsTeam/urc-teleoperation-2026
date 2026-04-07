
import asyncssh
from dotenv import load_dotenv
import os
import asyncio
import config # holds config values
import psutil
import random
from pathlib import Path

numClients = 0

# get data from secrets
load_dotenv()  # loads from .env
username = os.getenv("SSH_USER")
password = os.getenv("SSH_PASSWORD")


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
        await asyncio.sleep(config.RpiPollingRate)


async def asyncsshloop(sio):
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
                        "192.168.1.20",
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

            await sio.emit('antennastats', data)

        except Exception as e:
            if not config.silenceSSHErrors:
                print("SSH error:", e)

            await sio.emit('antennastats', {'status': "ERROR: OFFLINE"})

            # reset connection and back off slightly
            if conn is not None:
                conn.close()
                await conn.wait_closed()
                conn = None
            await asyncio.sleep(config.AntennaPollingRate)

        await asyncio.sleep(config.AntennaPollingRate)



# function to generate and send fake data, pass in --offline flag to server to use
async def send_fake_antenna_stats(sio):
    while True:
        data = {
            'status': "GOOD", # Reports good if link is successful
            'dbm': random.randint(-90, -30),             # signal strength
            'txrate': round(random.uniform(1, 10), 2),  # Mbps
            'rxrate': round(random.uniform(1, 10), 2),  # Mbps
            'freq': random.choice([904, 914, 924]),   # MHz
            'freqwidth': random.choice([3, 5, 8, 20]),
            'noise': random.randint(-100, -70),          # dBm
            'efficiency': round(random.uniform(0, 100), 2)  # %
        }

        await sio.emit('antennastats', data)
        await asyncio.sleep(config.AntennaPollingRate)



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