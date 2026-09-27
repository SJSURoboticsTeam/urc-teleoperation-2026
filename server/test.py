import serial
import time
from pyubx2 import UBXReader, UBXMessage, SET, POLL

with serial.Serial('COM9', 57600, timeout=3) as stream:
    # enable NAV-PVT output
    msg = UBXMessage(
        'CFG',
        'CFG-MSG',
        SET,
        msgClass=0x01,
        msgID=0x07,
        rateUART1=1,
    )
    stream.write(msg.serialize())
    stream.flush()
    print("Sent NAV-PVT enable command")
    time.sleep(0.5)

    ubr = UBXReader(stream)
    while True:
        try:
            raw, parsed = ubr.read()
            if parsed:
                print(f"Got: {parsed.identity}")
                if parsed.identity == "NAV-PVT":
                    print(f"hAcc: {parsed.hAcc} mm")
                    print(f"vAcc: {parsed.vAcc} mm")
                    print(f"lat:  {parsed.lat}")
                    print(f"lon:  {parsed.lon}")
                    print("---")
        except Exception as e:
            print(f"Error: {e}")
            continue