import asyncio
import random
import aiohttp
import time
from collections import deque

VideoPollingRate = 0.1
RateWindow = 10
FakeVideoPollingRate = 2
camera_names = ["mast", "wheels", "arm1", "arm2", "science"]

GOOD_MAX = 1.0      #adjust number after testing real cameras
DEGRADED_MAX = 5.0  #adjust number after testing real cameras

MediaMTXHost = "127.0.0.1"
MediaMTXApiPort = 9997

def classify(dropped_per_sec):
    if dropped_per_sec is None:
        return "UNAVAILABLE"
    if dropped_per_sec <= GOOD_MAX:
        return "GOOD"
    if dropped_per_sec <= DEGRADED_MAX:
        return "DEGRADED"
    return "BAD"

async def send_fake_video_stats(sio):
    while True:
        stats = {}

        for name in camera_names:
            if random.randint(1, 10) == 1:
                stats[name] = {"status": "UNAVAILABLE", "droppedPerSec": None}
            else:
                dropped = round(random.uniform(0, 10), 2)
                stats[name] = {
                    "status": classify(dropped),
                    "droppedPerSec": dropped,
                }
        await sio.emit("videostats", stats)
        await asyncio.sleep(FakeVideoPollingRate)

recent_counts = {name: deque(maxlen=RateWindow + 1) for name in camera_names}

async def get_dropped_frames(session, camera_name):
    url = f"http://{MediaMTXHost}:{MediaMTXApiPort}/v3/paths/get/{camera_name}"
    try:
        async with session.get(url) as resp:
            data = await resp.json()
            return data.get("inboundFramesInError")
    except Exception:
        return None

async def videoloop(sio):
    timeout = aiohttp.ClientTimeout(total=0.5)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        while True:
            stats = {}

            for name in camera_names:
                total = await get_dropped_frames(session, name)
                dropped = None

                if total is not None:
                    history = recent_counts[name]
                    history.append((time.monotonic(), total))

                    if len(history) == history.maxlen:
                        oldest_time, oldest_total = history[0]
                        elapsed = history[-1][0] - oldest_time
                        new_errors = max(total - oldest_total, 0)
                        dropped = round(new_errors / elapsed, 1)
                else:
                    recent_counts[name].clear()

                stats[name] = {
                    "status": classify(dropped),
                    "droppedPerSec": dropped,
                }

            await sio.emit("videostats", stats)
            await asyncio.sleep(VideoPollingRate)