from autonomyclass import BlackboardClient
import asyncio
async def get_autonomy_states(sio):
    client = BlackboardClient()
    client.start()
    client.set("base/isBooted", True)
    print("Autonomy starting...")
    try:
        while True:
            data = {
                "isBooted": client.get("base/isBooted"),
                "isTeleoperating": client.get("base/isTeleop"),
            }
            await sio.emit("autonomyData", data)
            await asyncio.sleep(1)
    finally:
        client.stop()