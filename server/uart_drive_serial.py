import serial

class UartDriveSerial:
    def __init__(self, port, baudrate=115200):
        """
        Initialize the serial port.
        """
        self.ser = serial.Serial(port, baudrate=baudrate, timeout=0.1)

    def close(self):
        """
        Close the serial port
        """
        self.ser.close()

    def send_packet(self, msg_id, payload=b""):
        """
        Send a packet with the given message ID and payload.
        """
        length = len(payload)
        packet = bytes([msg_id, length]) + payload
        self.ser.write(packet)

    def read_packet(self):
        """
        Read a packet from the serial port.
        Returns a tuple of (message ID, payload) or None if no packet was received.
        """
        header = self.ser.read(2)
        if len(header) < 2:
            return None

        msg_id = header[0]
        length = header[1]
        payload = self.ser.read(length)

        if len(payload) < length:
            return None
        
        return msg_id,payload
 