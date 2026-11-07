import serial
import time

status_flags = {
    0: "CAN receive FIFO queue full",
    1: "CAN transmit FIFO queue full",
    2: "Error warning (EI), see SJA1000 datasheet",
    3: "Data Overrun (DOI), see SJA1000 datasheet",
    4: "Not used.",
    5: "Error Passive (EPI), see SJA1000 datasheet",
    6: "Arbitration Lost (ALI), see SJA1000 datasheet",
    7: "Bus Error (BEI), see SJA1000 datasheet"
}

# Use 'S3' for 100 Kbit, 'S8' for 1 Mbit
CAN_BITRATE_CMD = 'S8'

class CanSerial(serial.Serial):

    def __init__(self, port):
        super().__init__(port, 115200, rtscts=False, dsrdtr=False)

        # Reset device before initializing
        self.dtr = False
        self.rts = False
        time.sleep(0.2)

        self.dtr = True
        self.rts = False
        time.sleep(0.2)

        self.dtr = False
        self.rts = False
        time.sleep(0.2)

        # Empty prior queued characters. Each CR produces its own response,
        # and all responses must be consumed before issuing another command.
        self.write(b'\r\r\r')
        for _ in range(3):
            resp = self.read_can(0.5)
            # print(f"CANUSB FLUSH RESPONSE: {resp!r}")
            if not resp or resp[-1:] not in (b"\r", b"\x07"):
                raise ValueError("CANUSB did not acknowledge buffer flush")

        # Check CANUSB version to ensure communication with the unit
        self.write(b'V\r')
        resp = self.read_can(0.5)
        # print(f"CANUSB VERSION RESPONSE: {resp!r}")
        if not resp.startswith(b"V") or not resp.endswith(b"\r"):
            raise ValueError(f"Invalid CANUSB version response: {resp!r}")

        # Set up CAN speed before opening the channel
        self.write(f'{CAN_BITRATE_CMD}\r'.encode())
        resp = self.read_can(0.5)
        # print(f"CANUSB SPEED RESPONSE: {resp!r}")
        if resp != b"\r":
            raise ValueError(f"CANUSB rejected bitrate {CAN_BITRATE_CMD}: {resp!r}")

        # Opens the CAN port
        self.write(b'O\r')
        resp = self.read_can(0.5)
        # print(f"CANUSB OPEN RESPONSE: {resp!r}")
        if resp != b"\r":
            raise ValueError(f"CANUSB rejected open command: {resp!r}")

    def read_can(self, timeout):
        self.timeout = timeout
        response = bytearray()

        # CAN232 status failures return BELL (ASCII 7) without a CR.
        # Read one byte at a time so that response does not block waiting
        # for a terminator that will never arrive.
        while True:
            byte = self.read(1)
            if not byte:
                return bytes(response)

            response.extend(byte)
            if byte in (b"\r", b"\x07"):
                return bytes(response)
