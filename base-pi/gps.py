import random
import serial
from serial.tools import list_ports
from dataclasses import dataclass
from typing import Union
import time
import asyncio

@dataclass
class GNRMC:
    longitude: Union[float, None]  # current longitude
    latitude: Union[float, None]  # current latitude
    valid: bool  # is the GNRMC sentence valid (do we have a GPS lock)

@dataclass
class GPS_Data:
    latitude: float
    longitude: float

GPS_AUTO_ID = "1546:01A9"


class ZEDF9P:
    def __init__(self, port, baudrate, timeout: float = 0.01):
        self.gps_port = serial.Serial(port, baudrate, timeout=timeout)
        self.lines = []
        self.__gnrmc: GNRMC = GNRMC(None, None, False)

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

    def get_position(self) -> GPS_Data:
        """
        Should only be called when gnrmc is valid, otherwise
        this will error because longitude and latitude are None
        (not castable to float)
        """
        val = self.gnrmc
        return GPS_Data(longitude=val.longitude, latitude=val.latitude)

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
            b = self.gps_port.readline().decode("utf-8")
            if b.strip() == "":
                break
            lines.append(b)
        self.lines = lines
        self._process_available_sentences()

    def _process_available_sentences(self):
        """
        Processes all available sentences, updating self.gnrmc
        """
        for line in self.lines:
            if "$GNRMC" in line:
                try:
                    self.__gnrmc = self.process_gnrmc(line)
                except (IndexError, ValueError):
                    continue
    
    def close(self) -> None:
        self.gps_port.close()

def find_gps_port(vid_pid=GPS_AUTO_ID):
    """Search connected serial devices for one matching the given VID:PID.
    Returns the device path or None if not found."""
    for port in list_ports.comports():
        if port.hwid and vid_pid.lower() in port.hwid.lower():
            return port.device
    return None

async def read_gps_data(serial_ports, sio):
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
            gnrmc = gps.gnrmc
            if gnrmc.valid:
                data = {
                        'latitude': gnrmc.latitude,
                        'longitude': gnrmc.longitude,
                }
                await sio.emit("gpsData2", data)
                # print(f"Latitude: {position.latitude}, Longitude: {position.longitude}")
            else:
                print("No GPS lock")
            # time.sleep(0.01)
        except Exception as e:
            print(f'GPS thread error: {e}')
            try: gps.close()
            except Exception: pass
            serial_ports["gps"] = None
            serial_ports["gpsId"] = "disconnect"
        finally:
            await asyncio.sleep(connect_delay)  # Sleep briefly to prevent tight loop on error

async def send_fake_gps_data(sio):
    while True:
        data = {

            'latitude': round(random.uniform(37.334, 37.335), 5),
            'longitude': round(random.uniform(-121.882, -121.883), 5), 
        }

        await sio.emit('gpsData2', data)
        await asyncio.sleep(random.uniform(2,7))