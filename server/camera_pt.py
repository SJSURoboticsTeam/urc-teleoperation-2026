import asyncio
import config
import can_serial
import math


def register_camera_pt_events(sio,serial_ports):
    print("registering...")

    @sio.event
    async def mastCommands(sid,data):
        try:
            print("Camera Pan Commands X: " + str(data['xVel']) + " Y: " + str(data['yVel']))
            # frontend is from -90 to 90, but controls expects 0 to 180 so add 90
            panx_scaled = data['xVel'] + 90
            pany_scaled = data['yVel'] + 90
            # uses 1 byte (8-bit) UNSIGNED = range of 0-255
            panx = panx_scaled.to_bytes(1, 'big', signed=False).hex()
            pany = pany_scaled.to_bytes(1, 'big', signed=False).hex()
            # Mast CAN ID
            MAST_CAN_ID= "300" # 0x300

            can_msg = f't{MAST_CAN_ID}2{panx}{pany}\r'
            await asyncio.to_thread(serial_ports["drive"].write, can_msg.encode())
            print(f'[{sid}] Mast command sent: {can_msg}')

        except Exception as e:
            # if you are testing on a computer without serial, set the bool true to help your console
            print("Error sending Mast Pan Command!")
            if config.silenceSerialErrors == False:
                print(f'Error in mastCommands: {e}')



