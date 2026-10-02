import asyncio
import random
import aiohttp

VideoPollingRate = 2
camera_names = ["mast", "wheels", "arm1", "arm2", "science"]

GOOD_MAX = 1.0      
DEGRADED_MAX = 5.0

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
        await asyncio.sleep(VideoPollingRate)

last_error_count = {name: 0 for name in camera_names}

async def get_dropped_frames(session, camera_name):
    url = f"http://{MediaMTXHost}:{MediaMTXApiPort}/v3/paths/get/{camera_name}"
    try:
        async with session.get(url) as resp:
            data = await resp.json()
            return data.get("inboundFramesInError")
    except Exception:
        return None

async def videoloop(sio):
    async with aiohttp.ClientSession() as session:
        while True:
            stats = {}

            for name in camera_names:
                total = await get_dropped_frames(session, name)
                dropped = None

                if total is not None:
                    dropped = max(total - last_error_count[name], 0)
                    last_error_count[name] = total

                stats[name] = {
                    "status": classify(dropped),
                    "droppedPerSec": dropped,
                }

            await sio.emit("videostats", stats)
            await asyncio.sleep(VideoPollingRate)