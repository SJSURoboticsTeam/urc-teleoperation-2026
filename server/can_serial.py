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

        # Carriage returns to empty any prior command or queued character in the CANUSB
        self.write(('\r\r\r\r').encode())
        resp = self.read_can(0.2)
        print("RESPONSE:" + repr(resp))
        # if b"\r" not in self.read_can(0.2):
        if b"\r" not in resp:
            raise ValueError("Carriage Return Not Found-RESPONSE")

        # Check the CAN version to ensure communication with the unit
        self.write(('V\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found-VERSION")

        # Set up CAN speed - S8 is 1Mbit
        self.write(('S8\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found-SPEED")

        # Opens the CAN port
        self.write(('O\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found-PORT OPEN")

    def read_can(self, timeout):
        self.timeout = timeout
        return self.read_until(b"\r")