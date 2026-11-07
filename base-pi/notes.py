import asyncio
import json
from pathlib import Path

BASE_PI_DIRECTORY = Path(__file__).parent
NOTES_FILE = BASE_PI_DIRECTORY / "data" / "notes.json"
TEMP_NOTES_FILE = BASE_PI_DIRECTORY / "data" / "temp_notes.json"


def read_notes():
    try:
        text = NOTES_FILE.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {"markdown": "", "revision": 0}
    notes = json.loads(text)

    if (
        not isinstance(notes, dict)
        or not isinstance(notes.get("markdown"), str)
        or type(notes.get("revision")) is not int
        or notes["revision"] < 0
    ):
        raise ValueError("Invalid notes document")
    return notes


def register_notes_events(sio):
    @sio.event
    async def getNotes(sid):
        try:
            notes = await asyncio.to_thread(read_notes)
        except (OSError, ValueError) as e:
            return {"status": "ERROR", "message": str(e)}
        return {"status": "OK", **notes}

    write_mutex = asyncio.Lock()

    @sio.event
    async def saveNotes(sid, data):
        if not isinstance(data, dict) or not isinstance(data.get("markdown"), str):
            return {"status": "ERROR", "message": "Expected a markdown string"}

        async with write_mutex:
            try:
                current = await asyncio.to_thread(read_notes)
                updated = {
                    "markdown": data["markdown"],
                    "revision": current["revision"] + 1,
                }
                await asyncio.to_thread(
                    TEMP_NOTES_FILE.parent.mkdir, parents=True, exist_ok=True
                )
                await asyncio.to_thread(
                    TEMP_NOTES_FILE.write_text,
                    json.dumps(updated, ensure_ascii=False),
                    encoding="utf-8",
                )
                await asyncio.to_thread(TEMP_NOTES_FILE.replace, NOTES_FILE)
            except (OSError, ValueError) as e:
                return {"status": "ERROR", "message": str(e)}

            try:
                await sio.emit("notesUpdated", updated)
            except Exception as e:
                print(f"Notes saved, but broadcast failed: {e}")

        return {"status": "OK", **updated}
