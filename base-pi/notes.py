import asyncio
from pathlib import Path

BASE_PI_DIRECTORY = Path(__file__).parent
NOTES_FILE = BASE_PI_DIRECTORY / "data" / "notes.md"
TEMP_NOTES_FILE = BASE_PI_DIRECTORY / "data" / "temp_notes.md"


def register_notes_events(sio):
    @sio.event
    async def getNotes(sid):
        status = "OK"
        try:
            markdown = await asyncio.to_thread(NOTES_FILE.read_text, encoding="utf-8")
        except FileNotFoundError:
            # No file yet
            status = "OK"
            markdown = ""
        except OSError as e:
            return {"status": "ERROR", "message": str(e)}
        return {"status": status, "markdown": markdown}

    write_mutex = asyncio.Lock()

    @sio.event
    async def saveNotes(sid, data):
        if not isinstance(data, dict) or not isinstance(data.get("markdown"), str):
            return {"status": "ERROR", "message": "Expected a markdown string"}

        async with write_mutex:
            try:
                await asyncio.to_thread(
                    TEMP_NOTES_FILE.parent.mkdir, parents=True, exist_ok=True
                )
                await asyncio.to_thread(
                    TEMP_NOTES_FILE.write_text, data["markdown"], encoding="utf-8"
                )
                await asyncio.to_thread(TEMP_NOTES_FILE.replace, NOTES_FILE)
            except OSError as e:
                return {"status": "ERROR", "message": str(e)}

        return {"status": "OK"}
