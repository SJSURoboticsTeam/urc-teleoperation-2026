import asyncio
import random

VideoPollingRate = 2
camera_names = ["mast", "wheels", "arm1", "arm2", "science"]

GOOD_MAX = 1.0      
DEGRADED_MAX = 5.0  

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