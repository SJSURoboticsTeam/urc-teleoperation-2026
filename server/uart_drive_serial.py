import serial

class UartDriveSerial:
    def __init__(self, port, baudrate=115200):
        self.ser = serial.Serial(port, baudrate=baudrate, timeout=0.1)

    def close(self):
        self.ser.close()

    def send_packet(self, msg_id, payload=b""):
        length = len(payload)
        packet = bytes([msg_id, length]) + payload
        self.ser.write(packet)

    def read_packet(self):
        header = self.ser.read(2)
        if len(header) < 2:
            return None

        msg_id = header[0]
        length = header[1]
        payload = self.ser.read(length)

        if len(payload) < length:
            return None
        
        return msg_id,payload
 