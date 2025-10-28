import serial
import time

class CanSerial(serial.Serial):

    def __init__(self, port):
        super().__init__(port, 115200, rtscts=False, dsrdtr=False)

        self.dtr = False
        self.rts = False
        time.sleep(0.2)

        self.dtr = True
        self.rts = False
        time.sleep(0.2)

        self.dtr = False
        self.rts = False
        time.sleep(0.2)

        self.write(('\r\r\r\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found")

        self.write(('V\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found")


        self.write(('S8\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found")


        self.write(('O\r').encode())
        if b"\r" not in self.read_can(0.2):
            raise ValueError("Carriage Return Not Found")

    def read_can(self, timeout):
        self.timeout = timeout
        return self.read_until(b"\r")