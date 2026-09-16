import asyncio
import config
import can_serial
import math


def clamp(x, minimum, maximum):
    """Enforce a value between a range"""
    return max(minimum, min(x, maximum))

def register_camera_pt_events(sio,serial_ports):

    @sio.event
    async def mastCommands(sid,data):
        """Transmit a mast command over CAN"""
        try:
            print("Camera Pan Commands X: " + str(data['xVel']) + " Y: " + str(data['yVel']) + " Wheels X: " + str(data['wheels_x']))
            # frontend is from -90 to 90, but controls expects 0 to 180 so add 90
            panx_scaled = clamp(data['xVel'] + 90, 0 , 180)
            pany_scaled = clamp(data['yVel'] + 90, 0 , 180)
            wheels_x_scaled = clamp(data['wheels_x'] + 90, 0 , 180)
            # uses 1 byte (8-bit) UNSIGNED = range of 0-255
            panx = panx_scaled.to_bytes(1, 'big', signed=False).hex()
            pany = pany_scaled.to_bytes(1, 'big', signed=False).hex()
            wheels_x = wheels_x_scaled.to_bytes(1, 'big', signed=False).hex()
            # Mast CAN ID
            MAST_CAN_ID= "300" # 0x300

            can_msg = f't{MAST_CAN_ID}3{panx}{pany}{wheels_x}\r'
            await asyncio.to_thread(serial_ports["drive"].write, can_msg.encode())
            print(f'[{sid}] Mast command sent: {can_msg}')

        except Exception as e:
            # if you are testing on a computer without serial, set the bool true to help your console
            print("Error sending Mast Pan Command!")
            if config.silenceSerialErrors == False:
                print(f'Error in mastCommands: {e}')



