import random
import serial
from serial.tools import list_ports
from dataclasses import dataclass
from typing import Union
import time
import asyncio
import math
import queue
import threading

try:
    from pyubx2 import ERR_IGNORE, NMEA_PROTOCOL, RTCM3_PROTOCOL, UBX_PROTOCOL, UBXReader
    rtk_available = True
except ImportError:
    rtk_available = False

# Timeout allows the reader thread to shut down promptly.
READ_TIMEOUT_S = 1.0

@dataclass
class GNRMC:
    longitude: Union[float, None]  # current longitude
    latitude: Union[float, None]  # current latitude
    valid: bool  # is the GNRMC sentence valid (do we have a GPS lock)

@dataclass
class AccuracyEstimate:
    horizontal_m: float
    source: str

@dataclass
class GPS_Data:
    latitude: float
    longitude: float
    accuracy: Union[AccuracyEstimate, None] = None

GPS_AUTO_ID = "1546:01A9"

def calculate_distance_and_heading(start, end):
    """Return distance in meters and initial bearing clockwise from north."""
    start_latitude = math.radians(float(start["latitude"]))
    start_longitude = math.radians(float(start["longitude"]))
    end_latitude = math.radians(float(end["latitude"]))
    end_longitude = math.radians(float(end["longitude"]))

    latitude_delta = end_latitude - start_latitude
    longitude_delta = end_longitude - start_longitude
    haversine = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(start_latitude)
        * math.cos(end_latitude)
        * math.sin(longitude_delta / 2) ** 2
    )
    distance = 2 * 6_371_000 * math.asin(math.sqrt(haversine))

    y = math.sin(longitude_delta) * math.cos(end_latitude)
    x = (
        math.cos(start_latitude) * math.sin(end_latitude)
        - math.sin(start_latitude) * math.cos(end_latitude) * math.cos(longitude_delta)
    )
    heading = (math.degrees(math.atan2(y, x)) + 360) % 360
    return distance, heading


def add_distance_and_heading(data, gps_state):
    robot_position = gps_state.get("robot")
    if robot_position:
        data["distanceMeters"], data["headingDegrees"] = calculate_distance_and_heading(
            data, robot_position
        )
    else:
        data["distanceMeters"] = None
        data["headingDegrees"] = None

class ZEDF9P:
    def __init__(self, port, baudrate, timeout: float = 0.01):
        self.gps_port = serial.Serial(
            port, baudrate, timeout=READ_TIMEOUT_S if rtk_available else timeout,
            write_timeout=1, exclusive=True,
        )
        self.lines = []
        self._init_state()
        self._reader = None
        if rtk_available:
            self._reader = threading.Thread(target=self._reader_loop, daemon=True)
            self._reader.start()

        # sleep for a second to ensure we have data to populate self.gnrmc
        time.sleep(1)

    def _init_state(self):
        self.__gnrmc: GNRMC = GNRMC(None, None, False)
        self.__accuracy: Union[AccuracyEstimate, None] = None
        self.svin = None  # latest parsed UBX-NAV-SVIN
        self.on_rtcm = None  # optional callback(raw_frame: bytes), runs on the reader thread
        self._error: Union[Exception, None] = None
        self._stop = threading.Event()
        self._acks = queue.Queue(maxsize=32)
        self._tx_lock = threading.Lock()

    @property
    def reader_active(self) -> bool:
        return self._reader is not None

    @property
    def gnrmc(self):
        if self._reader is None:
            self._read_all_available_sentences()
        elif self._error is not None:
            raise self._error
        elif not self._reader.is_alive():
            raise RuntimeError("GPS reader thread stopped")
        return self.__gnrmc

    def _reader_loop(self):
        """Read frames until stopped; tolerate isolated read errors, store persistent ones."""
        reader = UBXReader(
            self.gps_port,
            protfilter=NMEA_PROTOCOL | UBX_PROTOCOL | RTCM3_PROTOCOL,
            quitonerror=ERR_IGNORE,
        )
        failures = 0
        while not self._stop.is_set():
            try:
                raw, parsed = reader.read()
                failures = 0
            except (serial.SerialException, OSError) as e:
                failures += 1
                if failures < 3 and self.gps_port.is_open and not self._stop.is_set():
                    time.sleep(0.1)
                    continue
                if not self._stop.is_set():
                    self._error = e
                return
            except Exception as e:
                print(f"GPS reader error: {e}")
                time.sleep(0.1)  # a persistent non-serial error must not spin the CPU
                continue
            if raw is None:
                continue
            try:
                self._handle_message(raw, parsed)
            except Exception as e:
                print(f"GPS message error: {e}")

    def _handle_message(self, raw: bytes, parsed):
        if raw[:1] == b"\xd3":
            if self.on_rtcm is not None:
                try:
                    self.on_rtcm(raw)
                except Exception as e:
                    print(f"RTCM callback error: {e}")
        elif raw[:2] == b"\xb5\x62":
            if parsed.identity == "NAV-SVIN":
                self.svin = parsed
            elif parsed.identity in ("ACK-ACK", "ACK-NAK"):
                try:
                    self._acks.put_nowait((parsed.identity, parsed.clsID, parsed.msgID))
                except queue.Full:
                    pass
        else:
            try:
                self._process_line(raw.decode("utf-8"))
            except (UnicodeDecodeError, ValueError, IndexError):
                pass

    def send_ubx(self, msg, timeout: float = 2.0):
        """
        Write a UBX config message and wait for its ACK-ACK. Blocks, so call it
        through asyncio.to_thread. Raises RuntimeError on ACK-NAK, TimeoutError
        if no ACK arrives in time.
        """
        if self._reader is None:
            raise RuntimeError("pyubx2 is not installed")
        with self._tx_lock:
            if self._error is not None:
                raise self._error
            while not self._acks.empty():
                self._acks.get_nowait()
            self.gps_port.write(msg.serialize())
            key = (msg.msg_cls[0], msg.msg_id[0])
            deadline = time.monotonic() + timeout
            while True:
                try:
                    ident, cls_id, msg_id = self._acks.get(timeout=max(deadline - time.monotonic(), 0))
                except queue.Empty:
                    raise TimeoutError(f"no ACK for {msg.identity} within {timeout}s") from None
                if (cls_id, msg_id) == key:
                    if ident == "ACK-NAK":
                        raise RuntimeError(f"receiver rejected {msg.identity}")
                    return

    def process_gnrmc(self, line: str) -> GNRMC:
        # parse the gnrmc sentences according to
        # https://www.sparkfun.com/datasheets/GPS/NMEA%20Reference%20Manual-Rev2.1-Dec07.pdf
        line = line.strip()
        parts = line.split(",")
        valid = parts[2] == "A"  # "A" for valid, "V" for invalid
        longitude = None
        latitude = None
        if valid:
            # latitude is in format "ddmm.mmmmm"
            latitude = float(parts[3][:2]) + float(parts[3][2:]) / 60
            if parts[4] == "S":
                latitude *= -1
            # longitude is also in format "ddmm.mmmmm"
            longitude = float(parts[5][:3]) + float(parts[5][3:]) / 60
            if parts[6] == "W":
                longitude *= -1
        return GNRMC(longitude, latitude, valid)

    def process_gngga(self, line: str):
        """
        Parse GNGGA for HDOP-based accuracy estimate.
        TODO: replace with hAcc from NAV-PVT or HPL from NAV-PL
        once firmware is updated to HPG 1.30+
        """
        try:
            parts = line.strip().split(",")
            fix_quality = int(parts[6])
            hdop = float(parts[8])
            if fix_quality <= 0 or hdop <= 0 or not math.isfinite(hdop):
                self.__accuracy = None
                return
            accuracy_m = round(hdop * 4, 3) 
            self.__accuracy = AccuracyEstimate(
                horizontal_m=accuracy_m,
                source="HDOP"
            )
        except (ValueError, IndexError):
            self.__accuracy = None

    def get_position(self) -> GPS_Data:
        """
        Should only be called when gnrmc is valid, otherwise
        this will error because longitude and latitude are None
        (not castable to float)
        """
        val = self.gnrmc
        return GPS_Data(longitude=val.longitude, latitude=val.latitude, accuracy=self.__accuracy)

    def has_gps_lock(self) -> bool:
        """
        Returns whether the ZEDF9P has a GPS lock (has valid GNSS Coordinates)
        """
        return self.gnrmc.valid

    def _read_all_available_sentences(self):
        """
        Read all available sentences; relies on there being a timeout
        to prevent an infinite loop

        Processes all available sentences after reading them, updating
        self.gnrmc
        """
        lines = []
        while 1:
            b = self.gps_port.readline()
            if b.strip() == b"":
                break
            try:
                decoded = b.decode("utf-8")
                lines.append(decoded)
            except UnicodeDecodeError:
                continue
        self.lines = lines
        self._process_available_sentences()

    def _process_available_sentences(self):
        """
        Processes all available sentences, updating self.gnrmc
        """
        for line in self.lines:
            self._process_line(line)

    def _process_line(self, line: str):
        if line.startswith("$") and line[3:6] == "RMC":
            self.__gnrmc = self.process_gnrmc(line)
        if "$GNGGA" in line:
            self.process_gngga(line)

    def close(self) -> None:
        self._stop.set()
        self.gps_port.close()
        if self._reader is not None and self._reader is not threading.current_thread():
            self._reader.join(timeout=2)

def find_gps_port(vid_pid=GPS_AUTO_ID):
    """Search connected serial devices for one matching the given VID:PID.
    Returns the device path or None if not found."""
    for port in list_ports.comports():
        if port.hwid and vid_pid.lower() in port.hwid.lower():
            return port.device
    return None

async def read_gps_data(serial_ports, sio, gps_state):
    disconnect_delay = 2
    connect_delay = 0.5
    # Auto-connect once at task startup; a later STOP ALL must stay disconnected.
    async with serial_ports["gps"]["lock"]:
        if serial_ports["gps"]["id"] == "disconnect":
            port = find_gps_port()
            if port is not None:
                try:
                    serial_ports["gps"]["port"] = await asyncio.to_thread(ZEDF9P, port, 57600)
                    serial_ports["gps"]["id"] = port
                    print(f"GPS auto-connected on {port}.")
                except Exception as e:
                    print(f"Failed to connect to GPS on {port}: {e}")
    await sio.emit("forcecanrefresh")

    while True:
        if serial_ports["gps"]["id"] == "disconnect":
            await asyncio.sleep(disconnect_delay)
            continue

        gps = serial_ports["gps"]["port"]

        try:
            if gps.has_gps_lock():
                position = gps.get_position()
                data = {
                        'latitude': position.latitude,
                        'longitude': position.longitude,
                        'accuracy_m': position.accuracy.horizontal_m if position.accuracy else None,
                        'accuracy_source': position.accuracy.source if position.accuracy else None
                }
                add_distance_and_heading(data, gps_state)
                await sio.emit("gpsData2", data)
                print(f"Latitude: {position.latitude}, Longitude: {position.longitude}, Accuracy: {position.accuracy}")
            else:
                print("No GPS lock")
        # try:
        #     gnrmc = gps.gnrmc
        #     if gnrmc.valid:
        #         data = {
        #                 'latitude': gnrmc.latitude,
        #                 'longitude': gnrmc.longitude,
        #         }
        #         await sio.emit("gpsData2", data)
        #         print(f"Latitude: {gnrmc.latitude}, Longitude: {position.longitude}, Accuracy: {position.accuracy}")
        #     else:
        #         print("No GPS lock")
        #     # time.sleep(0.01)
        except Exception as e:
            print(f'GPS thread error: {e}')
            if serial_ports["gps"]["port"] is gps:
                serial_ports["gps"]["port"] = None
                serial_ports["gps"]["id"] = "disconnect"
            try: await asyncio.to_thread(gps.close)
            except Exception: pass
        finally:
            await asyncio.sleep(connect_delay)  # Sleep briefly to prevent tight loop on error

async def send_fake_gps_data(sio, gps_state):
    while True:
        data = {

            'latitude': round(random.uniform(37.334, 37.335), 5),
            'longitude': round(random.uniform(-121.882, -121.883), 5), 
        }

        add_distance_and_heading(data, gps_state)
        await sio.emit('gpsData2', data)
        await asyncio.sleep(random.uniform(2,7))
