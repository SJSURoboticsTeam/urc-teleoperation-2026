"""Real science firmware link over the CANUSB (SLCAN) adapter.

Same interface as MockScienceLink, so the session, logging and frontend are unchanged.
Only the STEP / FINISHED_STEP handshake is wired up; sensor frames are logged raw
until firmware defines their layout.
"""

import asyncio

# UNVERIFIED with firmware: page 1 of the firmware CAN doc (pages 2-3 are a conflicting draft).
science_send_ID = {
    "STEP": "130",
    "HEARTBEAT": "000",
    "DRILL": "132",
    "COLOR_SENSOR_FIN": "034",
    "PRESSURE_HUMIDITY_TEMPERATURE_SENSOR_FIN": "035",
}
science_receive_ID = {
    "FINISHED_STEP": "030",
    "HEARTBEAT_ACK": "001",
    "DRILL_START_ACK": "032",
    "DRILL_FINISH": "033",
    "COLOR_SENSOR_DATA": "234",
    "PRESSURE_HUMIDITY_TEMPERATURE_SENSOR_DATA": "235",
}
RECEIVE_ID_TO_NAME = {can_id: name for name, can_id in science_receive_ID.items()}

# Drive's status frame also uses 0x030 (8 bytes), so FINISHED_STEP is only accepted with length 0.
# IDs not listed here are accepted with any length.
EXPECTED_DLC = {"FINISHED_STEP": 0}

MAX_DLC = 8


def encode_frame(can_id, payload=b""):
    """SLCAN standard frame: "t" + 3 hex ID + DLC + payload hex + CR, e.g. b"t1300\\r"."""
    if len(can_id) != 3 or any(c not in "0123456789abcdefABCDEF" for c in can_id):
        raise ValueError(f"CAN ID must be 3 hex characters, got {can_id!r}")
    if len(payload) > MAX_DLC:
        raise ValueError(f"classic CAN carries at most {MAX_DLC} data bytes, got {len(payload)}")
    return f"t{can_id.upper()}{len(payload):X}{bytes(payload).hex().upper()}\r".encode("ascii")


def encode_step_frame():
    # UNVERIFIED: no payload, so firmware tracks which step is next
    return encode_frame(science_send_ID["STEP"])


def decode_frame(data):
    """Returns {"frame", "id", "dlc", "payload"}, or None if this isn't a well-formed
    standard frame (adapter replies, extended frames, length not matching DLC)."""
    try:
        text = bytes(data).decode("ascii").strip()
        if len(text) < 5 or text[0] != "t":
            return None
        can_id = text[1:4].upper()
        int(can_id, 16)
        dlc = int(text[4], 16)
        payload_hex = text[5:]
        if dlc > MAX_DLC or len(payload_hex) != dlc * 2:
            return None
        return {"frame": text, "id": can_id, "dlc": dlc, "payload": bytes.fromhex(payload_hex)}
    except (UnicodeDecodeError, ValueError):
        return None


class CanScienceLink:
    is_mock = False

    def __init__(self, serial_ports, session):
        self.serial_ports = serial_ports
        self.session = session
        self._unknown_seen = set()

    async def send_step(self, site, step):
        serial = self.serial_ports.get("science")
        if serial is None:
            return False

        frame = encode_step_frame()
        try:
            await asyncio.to_thread(serial.write, frame)
        except Exception as e:
            print(f"[SCIENCE CAN] step send failed: {e}")
            self._invalidate_connection("send failure")
            return False
        self.session.log_event("can_tx", site=site, step=step, data={"frame": frame.decode().strip()})
        return True

    async def send_stop(self):
        # TODO(firmware): the doc puts the semi e-stop on 0x00, which is also the heartbeat ID
        print("\033[91m[SCIENCE CAN] no STOP frame defined: firmware was NOT told to stop\033[0m")
        return False

    def _invalidate_connection(self, reason):
        try:
            serial = self.serial_ports.get("science")
            if serial is not None:
                serial.close()
        except Exception:
            pass
        self.serial_ports["science"] = None
        self.serial_ports["scienceId"] = "disconnect"
        print(f"[SCIENCE CAN] connection invalidated: {reason}")

    async def handle_data(self, data):
        if data.startswith(b"\x07"):
            print("[SCIENCE CAN] adapter rejected a command (transmit FIFO full?)")
            return
        for chunk in data.split(b"\r"):
            if chunk:
                await self._handle_frame(decode_frame(chunk))

    def _report_unknown(self, frame, reason):
        # once per ID and length, so a chatty bus doesn't fsync a log line per frame
        key = (frame["id"], frame["dlc"])
        if key in self._unknown_seen:
            return
        self._unknown_seen.add(key)
        self.session.log_event(
            "can_rx_unknown", site=self.session.active_site_id(),
            data={"frame": frame["frame"], "reason": reason},
        )

    async def _handle_frame(self, frame):
        if frame is None:
            return
        name = RECEIVE_ID_TO_NAME.get(frame["id"])
        if name is None:
            self._report_unknown(frame, "unknown id")
            return
        expected = EXPECTED_DLC.get(name)
        if expected is not None and frame["dlc"] != expected:
            self._report_unknown(frame, f"{name} expects length {expected}, got {frame['dlc']}")
            return

        site = self.session.active_site_id()
        self.session.log_event("can_rx", site=site, data={"frame": frame["frame"], "name": name})

        if name == "FINISHED_STEP":
            # Known gap: with no step number in the ack, a late ack after a timeout + retry,
            # or a duplicate, is accepted for the current step.
            await self.session.handle_step_finished(self.session.pending_step())
        elif name == "DRILL_START_ACK":
            self.session.log_event("drill_started", site=site, data={"payload": frame["payload"].hex()})
        elif name == "DRILL_FINISH":
            # TODO(firmware): depth_cm stays null until firmware says whether it reports depth
            self.session.log_event(
                "drill_finished", site=site, data={"depth_cm": None, "payload": frame["payload"].hex()}
            )
        # TODO(firmware): decode COLOR_SENSOR_DATA / PRESSURE_HUMIDITY_TEMPERATURE_SENSOR_DATA and call
        # session.handle_color_reading / handle_environment_reading once the layout is defined.


async def read_science_can_loop(serial_ports, link):
    """Like read_arm_can_loop: idles until connectScience sets serial_ports["science"]."""
    while True:
        try:
            serial = serial_ports.get("science")
            if serial is None:
                await asyncio.sleep(0.1)
                continue

            data = await asyncio.to_thread(serial.read_can, 0.5)
            if data:
                await link.handle_data(data)
            await asyncio.sleep(0.01)
        except Exception as e:
            print(f"Science CAN thread error: {e}")
            link._invalidate_connection("read loop failure")
            await asyncio.sleep(0.25)
