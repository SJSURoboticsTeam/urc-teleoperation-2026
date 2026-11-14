"""Write-through JSON Lines log for science missions.

One file per server run: server/logs/science/science_<YYYYmmdd_HHMMSS>.jsonl.
Every record is flushed and fsynced as it is written, because the physical E-stop
cuts power and shutdown() never runs. Science data is a few lines per minute, so
doing the (sub-millisecond) write inline in async code is fine; if it ever got hot,
asyncio.to_thread would be the fix.
"""

import json
import os
from datetime import datetime
from pathlib import Path

DEFAULT_LOG_DIR = Path(__file__).resolve().parent / "logs" / "science"  # not CWD-relative: CI runs from the repo root


class ScienceLogger:
    """log() raises on I/O errors; ScienceSession catches and prints them so a full
    disk never stops the mission."""

    def __init__(self, directory=None, is_mock=False):
        self.directory = Path(directory) if directory is not None else DEFAULT_LOG_DIR
        self.is_mock = is_mock
        self._filename = None  # chosen on the first write, so None until then
        self._file = None

    @property
    def filename(self):
        return self._filename

    def log(self, type_, **fields):
        record = {
            "t": datetime.now().astimezone().isoformat(timespec="milliseconds"),
            "type": type_,
            **fields,
            "mock": self.is_mock,
        }
        # allow_nan=False: a bare NaN is not valid JSON, so refuse it instead of writing a bad line
        line = json.dumps(record, allow_nan=False, default=str) + "\n"

        file = self._open()
        file.write(line)
        file.flush()
        os.fsync(file.fileno())

    def _open(self):
        if self._file is not None:
            return self._file

        self.directory.mkdir(parents=True, exist_ok=True)
        created = self._filename is None
        if created:
            self._filename = f"science_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        # append mode so a log() after close() continues the same file instead of losing data
        self._file = open(self.directory / self._filename, "a", encoding="utf-8")
        if created:
            self._fsync_directory()  # make the new file's directory entry survive a power cut too
        return self._file

    def _fsync_directory(self):
        try:
            fd = os.open(self.directory, os.O_RDONLY)
        except OSError:
            return  # e.g. Windows can't open directories; the file's own fsync still happens
        try:
            os.fsync(fd)
        except OSError:
            pass
        finally:
            os.close(fd)

    def close(self):
        if self._file is not None:
            try:
                self._file.close()
            finally:
                self._file = None
