import random
import asyncio

MAX_VOLTAGE = 40
MIN_VOLTAGE = 36

async def get_battery_voltage(sio):
    # TODO: implement once firmware is ready
    pass

async def send_fake_battery_voltage(sio):
    voltage = MAX_VOLTAGE
    while True:
        voltage -= .02 + random.gauss(0, .05)
        if voltage < MIN_VOLTAGE:
            voltage = MAX_VOLTAGE
        percentage = ((voltage - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) * 100
        await sio.emit('batteryPercentage', min(100, max(0, percentage)))
        await asyncio.sleep(.25)