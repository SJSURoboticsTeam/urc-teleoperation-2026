import asyncio
import base64

import serial
from serial.tools import list_ports


class SerialConsole:
    def __init__(self):
        self.port = None
        self.port_id = "disconnect"
        self.baudrate = 115200
        self.dtr = False
        self.rts = False
        self.reader_started = False

    def info(self):
        return {
            "status": "OK",
            "ports": [port.device for port in list_ports.comports()],
            "portId": self.port_id,
            "baudrate": self.baudrate,
            "connected": self.port is not None and self.port.is_open,
            "dtr": self.dtr,
            "rts": self.rts,
        }

    def open(self, port_id, baudrate):
        self.close()
        self.port = serial.Serial(
            port_id,
            baudrate=baudrate,
            timeout=0.1,
            write_timeout=1,
            rtscts=False,
            dsrdtr=False,
        )
        self.port_id = port_id
        self.baudrate = baudrate
        self.port.dtr = False
        self.port.rts = False
        self.dtr = False
        self.rts = False

    def close(self):
        if self.port is not None:
            try:
                self.port.close()
            finally:
                self.port = None
                self.port_id = "disconnect"
                self.dtr = False
                self.rts = False

    def write(self, data):
        if self.port is None or not self.port.is_open:
            raise RuntimeError("Serial console is not connected")
        self.port.write(data)

    def set_dtr(self, enabled):
        if self.port is None or not self.port.is_open:
            raise RuntimeError("Serial console is not connected")
        self.port.dtr = enabled
        self.dtr = enabled

    def set_rts(self, enabled):
        if self.port is None or not self.port.is_open:
            raise RuntimeError("Serial console is not connected")
        self.port.rts = enabled
        self.rts = enabled

    def read(self):
        if self.port is None or not self.port.is_open:
            return b""
        return self.port.read(4096)


async def serial_console_read_loop(console, sio):
    while True:
        try:
            if console.port is None or not console.port.is_open:
                await asyncio.sleep(0.1)
                continue

            data = await asyncio.to_thread(console.read)
            if data:
                await sio.emit(
                    "serialConsoleData",
                    {"data": base64.b64encode(data).decode("ascii")},
                )
        except Exception as error:
            console.close()
            await sio.emit("serialConsoleStatus", console.info())
            await sio.emit("serialConsoleError", {"message": str(error)})
            await asyncio.sleep(0.1)


def register_serial_console_events(sio, console):
    @sio.event
    async def getSerialConsoleInfo(sid):
        return console.info()

    @sio.event
    async def openSerialConsole(sid, data):
        try:
            port_id = data.get("portId", "")
            baudrate = int(data.get("baudrate", 115200))
            if not port_id or baudrate <= 0:
                raise ValueError("A serial port and positive baud rate are required")

            await asyncio.to_thread(console.open, port_id, baudrate)
            if not console.reader_started:
                console.reader_started = True
                sio.start_background_task(serial_console_read_loop, console, sio)
            await sio.emit("serialConsoleStatus", console.info())
            return {"status": "OK"}
        except Exception as error:
            console.close()
            return {"status": "ERROR", "message": str(error)}

    @sio.event
    async def closeSerialConsole(sid):
        try:
            await asyncio.to_thread(console.close)
            await sio.emit("serialConsoleStatus", console.info())
            return {"status": "OK"}
        except Exception as error:
            return {"status": "ERROR", "message": str(error)}

    @sio.event
    async def writeSerialConsole(sid, data):
        try:
            encoded = data.get("data", "")
            payload = base64.b64decode(encoded, validate=True)
            if len(payload) > 16_384:
                raise ValueError("Serial writes are limited to 16 KiB")
            await asyncio.to_thread(console.write, payload)
            return {"status": "OK"}
        except Exception as error:
            return {"status": "ERROR", "message": str(error)}

    @sio.event
    async def setSerialConsoleDtr(sid, data):
        try:
            enabled = data.get("enabled")
            if not isinstance(enabled, bool):
                raise ValueError("DTR state must be a boolean")
            await asyncio.to_thread(console.set_dtr, enabled)
            return {"status": "OK", "enabled": enabled}
        except Exception as error:
            return {"status": "ERROR", "message": str(error)}

    @sio.event
    async def setSerialConsoleRts(sid, data):
        try:
            enabled = data.get("enabled")
            if not isinstance(enabled, bool):
                raise ValueError("RTS state must be a boolean")
            await asyncio.to_thread(console.set_rts, enabled)
            return {"status": "OK", "enabled": enabled}
        except Exception as error:
            return {"status": "ERROR", "message": str(error)}

    @sio.event
    async def pulseSerialConsoleDtr(sid, data):
        try:
            duration_ms = int(data.get("durationMs", 200))
            if duration_ms < 10 or duration_ms > 5000:
                raise ValueError("DTR pulse must be between 10 and 5000 ms")
            await asyncio.to_thread(console.set_dtr, True)
            await asyncio.sleep(duration_ms / 1000)
            await asyncio.to_thread(console.set_dtr, False)
            await sio.emit("serialConsoleStatus", console.info())
            return {"status": "OK"}
        except Exception as error:
            return {"status": "ERROR", "message": str(error)}
