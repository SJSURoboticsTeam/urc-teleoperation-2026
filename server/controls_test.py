from can_serial import CanSerial
import time

print("Connecting to CAN bus")
try:
    drive_serial = CanSerial('/dev/tty.usbserial-59760073491')
    print("Drive connected.")
except Exception as e:
    print("FAILURE TO CONNECT DRIVE: " + str(e))

time.sleep(5)

while(1):
    try:
        can_msg = f't00C70000000000000\r'
        drive_serial.write(can_msg.encode())
    except Exception as e:
        print(f'Error writing command: {e}')
    
    time.sleep(1)