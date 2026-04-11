import socket

import serial
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
    time: float  


class ZEDF9P:
    start_time = time.time()
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

    def process_gnrmc(self, line: str) -> None:
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
        new_time = time.time()
        signal_time = new_time - self.start_time
        self.start_time = new_time
        return GPS_Data(longitude=val.longitude, latitude=val.latitude, time=signal_time)

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
                self.__gnrmc = self.process_gnrmc(line)

async def read_gps_data(serial_ports, sio):
    while True:
        gps = serial_ports['gps']
        try:
            if gps.has_gps_lock():
                position = gps.get_position()
                data = {
                        'latitude': position.latitude,
                        'longitude': position.longitude,
                        'time': position.time,
                }
                await sio.emit("gpsData", data)
                # print(f"Latitude: {position.latitude}, Longitude: {position.longitude}")
            else:
                print("No GPS lock")
            # time.sleep(0.01)
        except Exception as e:
            print(f'GPS thread error: {e}')
        finally:
            await asyncio.sleep(0.5)  # Sleep briefly to prevent tight loop on error

# /dev/tty.usbmodem14301
# if(__name__ == "__main__"):
#     #TODO check for gps on port
#     gps = ZEDF9P("COM7", 57600)
#     while(True):
#         if gps.has_gps_lock():
#             position = gps.get_position()
#             print(f"Latitude: {position.latitude}, Longitude: {position.longitude}")
#         else:
#             print("No GPS lock")
#         time.sleep(1)