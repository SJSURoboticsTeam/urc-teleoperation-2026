import serial

# UART serial wrapper for drive communication
class UartDriveSerial:
    def __init__(self, port, baudrate=115200):
        # open UART serial port
        self.ser = serial.Serial(port, baudrate=baudrate, timeout=0.1)

    def close(self):
        # close UART serial port
        self.ser.close()

    def send_packet(self, msg_id, payload=b""):
        # packet format for now:
        # [msg_id][length][payload]
        length = len(payload)
        packet = bytes([msg_id, length]) + payload
        self.ser.write(packet)

    def read_packet(self):
        # read first 2 bytes as [msg_id][length]
        header = self.ser.read(2)
        if len(header) < 2:
            return None

        msg_id = header[0]
        length = header[1]

        # then read the payload based on the packet length
        payload = self.ser.read(length)
        if len(payload) < length:
            return None

        return msg_id, payload
    