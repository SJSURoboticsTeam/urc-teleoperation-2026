import asyncio
import json
from collections import OrderedDict
from pathlib import Path

import socketio

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
    completed_saves = OrderedDict()
    MAX_COMPLETED_SAVES = 256

    @sio.event
    async def saveNotes(sid, data):
        if not isinstance(data, dict) or not isinstance(data.get("markdown"), str):
            return {"status": "ERROR", "message": "Expected a markdown string"}
        operation_id = data.get("operationId")
        if not isinstance(operation_id, str) or not operation_id:
            return {"status": "ERROR", "message": "Expected an operation id"}

        async with write_mutex:
            cached = completed_saves.get(operation_id)
            if cached is not None:
                if cached["markdown"] != data["markdown"]:
                    return {
                        "status": "ERROR",
                        "message": "Operation id used with different content",
                    }
                completed_saves.move_to_end(operation_id)
                return cached
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

            response = {"status": "OK", **updated}
            completed_saves[operation_id] = response
            if len(completed_saves) > MAX_COMPLETED_SAVES:
                completed_saves.popitem(last=False)

            try:
                await sio.emit("notesUpdated", updated)
            except socketio.exceptions.ConnectionError as e:
                print(f"Notes saved, but broadcast failed: {e}")

        return response
