import asyncio
<<<<<<< HEAD
from uart_drive_serial import UartDriveSerial
from drive_uart import (
=======
from uart_drive_serial import UartDrivesSerial
from drive import (
>>>>>>> a37f01f (Add UART prototype path for drive backend communication)
    build_set_chassis_velocities_payload,
    parse_drive_packet,
)

class FakeSerial:
    def __init__(self):
        self.written = bytearray()
        self.read_buffer = bytearray()

    def write(self, data):
        self.written.extend(data)

    def read(self, n):
        data = self.read_buffer[:n]
        self.read_buffer = self.read_buffer[n:]
        return bytes(data)

    def close(self):
        pass


async def main():
    print("=== Test 1: build_set_chassis_velocities_payload ===")
    payload = build_set_chassis_velocities_payload(1.0, 0.0, 0.5, 1)
    print("Payload bytes:", payload)
    print("Payload hex:", payload.hex())
    print("Payload length:", len(payload))
    print()

    print("=== Test 2: negative velocity payload ===")
    neg_payload = build_set_chassis_velocities_payload(-1.0, 0.0, -0.5, 0)
    print("Negative payload hex:", neg_payload.hex())
    print("Negative payload length:", len(neg_payload))
    print()

    print("=== Test 3: UART send_packet ===")
<<<<<<< HEAD
    uart = UartDriveSerial.__new__(UartDriveSerial)
=======
    uart = UartDrivesSerial.__new__(UartDrivesSerial)
>>>>>>> a37f01f (Add UART prototype path for drive backend communication)
    uart.ser = FakeSerial()

    uart.send_packet(0x40, payload)
    print("Written bytes:", uart.ser.written)
    print("Written hex:", uart.ser.written.hex())
    print()

    print("=== Test 4: UART read_packet ===")
    uart.ser.read_buffer = bytearray.fromhex("6306100000000020")
    packet = uart.read_packet()
    print("Read packet:", packet)
    print()

    print("=== Test 5: parse_drive_packet ===")
    await parse_drive_packet((0x63, bytes.fromhex("100000000020")))
    print()

    print("=== Test 6: bad packet length ===")
    await parse_drive_packet((0x63, bytes.fromhex("1000")))
    print()


if __name__ == "__main__":
    asyncio.run(main())