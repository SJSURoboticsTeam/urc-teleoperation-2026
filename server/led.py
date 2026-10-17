import asyncio
import random

# See CAN Frames document for message specification

LED_CONTROL_ID = 0x304
LENGTH = 6


def clamp(val, minimum, maximum):
    return min(maximum, max(minimum, val))


def register_led_events(sio, serial_ports):
    @sio.event
    async def led_control(sid, data):
        await send_led(
            serial_ports,
            data["brightness"],
            data["red"],
            data["green"],
            data["blue"],
            data["time_on"],
            data["time_off"],
        )


async def send_led(serial_ports, brightness, red, green, blue, time_on, time_off):
    brightness = clamp(brightness, 0, 32)
    red = clamp(red, 0, 255)
    green = clamp(green, 0, 255)
    blue = clamp(blue, 0, 255)
    time_on = clamp(time_on, 0, 255)
    time_off = clamp(time_off, 0, 255)

    can_message = (
        f"t{LED_CONTROL_ID:03X}{LENGTH}"
        f"{brightness:02X}"
        f"{red:02X}"
        f"{green:02X}"
        f"{blue:02X}"
        f"{time_on:02X}"
        f"{time_off:02X}\r"
    )

    print(repr(can_message))

    await asyncio.to_thread(serial_ports["drive"].write, can_message.encode())


async def run_led_demo(serial_ports):
    while True:
        await send_led(
            serial_ports,
            brightness=random.randint(16, 32),
            red=random.randint(0, 255),
            green=random.randint(0, 255),
            blue=random.randint(0, 255),
            time_on=100,
            time_off=100,
        )
        await asyncio.sleep(0.5)
