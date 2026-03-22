
import asyncssh
from dotenv import load_dotenv
import os
import asyncio
import config # holds config values
import psutil
from pathlib import Path

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
        await asyncio.sleep(config.RpiPollingRate)


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

