import random
import serial
from serial.tools import list_ports
from dataclasses import dataclass
from typing import Union
import time
import asyncio
import math

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
        self.gps_port = serial.Serial(port, baudrate, timeout=timeout)
        self.lines = []
        self.__gnrmc: GNRMC = GNRMC(None, None, False)
        self.__accuracy: Union[AccuracyEstimate, None] = None

        # sleep for a second to ensure we have data to populate self.gnrmc
        time.sleep(1)

    @property
    def gnrmc(self):
        self._read_all_available_sentences()
        return self.__gnrmc

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
            if line.startswith("$") and line[3:6] == "RMC":
                self.__gnrmc = self.process_gnrmc(line)
            if "$GNGGA" in line:
                self.process_gngga(line)
    
    def close(self) -> None:
        self.gps_port.close()

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
    while True:
        if serial_ports["gpsId"] == "disconnect":
            port = find_gps_port()
            if port is None:
                await asyncio.sleep(disconnect_delay)
                continue
            try:
                serial_ports["gps"] = await asyncio.to_thread(ZEDF9P, port, 57600)
                serial_ports["gpsId"] = port
                print(f"GPS auto-connected on {port}.")
            except Exception as e:
                print(f"Failed to connect to GPS on {port}: {e}")
                await asyncio.sleep(disconnect_delay)
            continue

        gps = serial_ports['gps']

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
            try: gps.close()
            except Exception: pass
            serial_ports["gps"] = None
            serial_ports["gpsId"] = "disconnect"
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