import asyncio

DRIVE_MSG_ID = {
    "SET_CHASSIS_VELOCITIES": 0x40,
    "HEARTBEAT": 0x41,
    "HOMING_SEQUENCE": 0x42,
    "GET_ESTIMATED_VELOCITIES": 0x43,
    "GET_OFFSET": 0x44,
    "CONFIG": 0x5F,
}

DRIVE_REPLY_ID = {
    "SET_VELOCITIES_RESPONSE": 0x60,
    "HEARTBEAT_REPLY": 0x61,
    "HOMING_SEQUENCE_RESPONSE": 0x62,
    "RETURN_ESTIMATED_CHASSIS_VELOCITIES": 0x63,
    "RETURN_OFFSET": 0x64,
    "CONFIG_ACK": 0x7F,
}

def build_set_chassis_velocities_payload(x_vel, y_vel, rot_vel, module_conflicts):
    x_scaled = int(x_vel * (2 ** 12))
    y_scaled = int(y_vel * (2 ** 12))
    rot_scaled = int(rot_vel * (2 ** 6))
    mod_conf = int(module_conflicts)

    return (
        x_scaled.to_bytes(2, "big", signed=True) +
        y_scaled.to_bytes(2, "big", signed=True) +
        rot_scaled.to_bytes(2, "big", signed=True) +
        mod_conf.to_bytes(1, "big", signed=False)
    )

def register_drive_events(sio, serial_ports):
    @sio.event
    async def driveCommands(sid, data):
        try:
            drive = serial_ports["drive"]
            if drive is None:
                print("Drive UART not connected")
                return

            payload = build_set_chassis_velocities_payload(
                data["xVel"],
                data["yVel"],
                data["rotVel"],
                data["moduleConflicts"],
            )

            await asyncio.to_thread(
                drive.send_packet,
                DRIVE_MSG_ID["SET_CHASSIS_VELOCITIES"],
                payload,
            )
            print(f"[{sid}] Drive UART command sent")
        except Exception as e:
            print(f"Error in driveCommands: {e}")

    @sio.event
    async def driveHoming(sid):
        try:
            drive = serial_ports["drive"]
            if drive is None:
                print("Drive UART not connected")
                return

            await asyncio.to_thread(
                drive.send_packet,
                DRIVE_MSG_ID["HOMING_SEQUENCE"],
                b""
            )
            print(f"[{sid}] Homing initiated")
        except Exception as e:
            print(f"Error in driveHoming: {e}")

async def parse_drive_packet(packet):
    msg_id, payload = packet

    if msg_id == DRIVE_REPLY_ID["HEARTBEAT_REPLY"]:
        print("Heartbeat Reply")

    elif msg_id == DRIVE_REPLY_ID["RETURN_ESTIMATED_CHASSIS_VELOCITIES"]:
        if len(payload) != 6:
            print("Bad estimated velocity payload length")
            return

        x_vel = int.from_bytes(payload[0:2], "big", signed=True)
        y_vel = int.from_bytes(payload[2:4], "big", signed=True)
        rot_vel = int.from_bytes(payload[4:6], "big", signed=True)

        print(f"est x vel: {x_vel}")
        print(f"est y vel: {y_vel}")
        print(f"est rot vel: {rot_vel}")

async def read_drive_uart_loop(serial_ports):
    try:
        while True:
            drive = serial_ports["drive"]
            if drive is not None:
                packet = await asyncio.to_thread(drive.read_packet)
                if packet:
                    await parse_drive_packet(packet)
            await asyncio.sleep(0.01)
    except Exception as e:
        print(f"Drive UART task error: {e}")

async def send_drive_heartbeat(serial_ports):
    try:
        while True:
            drive = serial_ports["drive"]
            if drive is not None:
                await asyncio.to_thread(
                    drive.send_packet,
                    DRIVE_MSG_ID["HEARTBEAT"],
                    b""
                )
                print("Sent drive heartbeat")
            await asyncio.sleep(5)
    except Exception as e:
        print(f"Drive heartbeat error: {e}")
