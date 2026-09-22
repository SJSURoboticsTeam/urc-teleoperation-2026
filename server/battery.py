import random
import asyncio

async def get_battery_voltage(sio):
    # TODO: create skeleton for receiving batteryVoltage
    pass

async def get_fake_battery_voltage(sio):
    voltage = 40
    while True:
        voltage -= .02
        if voltage < 36:
            voltage = 40
        await sio.emit('batteryVoltage', voltage + random.gauss(0, .05))
        await asyncio.sleep(.25)