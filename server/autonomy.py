from autonomyclass import BlackboardClient
import asyncio
async def get_autonomy_states(sio):
    client = BlackboardClient()
    client.start()
    client.set("base/isBooted", True)
    print("Autonomy starting...")
    while True:
        isBooted = client.get("base/isBooted")
        isTeleoperating = client.get("base/isTeleop")
        print("Data: " + str(isBooted))
        data = {
        'isBooted': isBooted,
        'isTeleoperating': isTeleoperating,
        }
        await sio.emit("autonomyData", data)
        await asyncio.sleep(1)