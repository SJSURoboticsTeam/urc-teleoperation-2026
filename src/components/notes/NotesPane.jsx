import {
  MDXEditor,
  markdownShortcutPlugin,
  headingsPlugin,
  toolbarPlugin,
  listsPlugin,
  thematicBreakPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { basesocket } from "../socket.io/socket";
import { useState, useEffect, useRef } from "react";

export default function NotesPane() {
  const [markdown, setMarkdown] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const latestSave = useRef(0);

  useEffect(() => {
    let active = true;

    basesocket.timeout(3000).emit("getNotes", (err, response) => {
      if (!active) return; // prevent late load

      if (err || response?.status != "OK") {
        console.log(response?.message ?? "Could not load notes");
        return;
      }

      setMarkdown(response.markdown);
    });
    return () => {
      active = false;
    };
  }, []);

  function handleChange(markdown, markdownInitialize) {
    if (markdownInitialize) return;

    const requestId = ++latestSave.current;

    if (!basesocket.connected) {
      setSaveStatus("Unsaved: base-pi disconnected");
      return;
    }

    setSaveStatus("Saving...");

    basesocket.timeout(3000).emit(
      "saveNotes",
      { markdown },
      (err, response) => {
        if (requestId != latestSave.current) return;

        if (err) {
          setSaveStatus("Save unconfirmed: request timed out")
        } else if (response?.status == "OK") {
          setSaveStatus("Saved");
        } else {
          setSaveStatus("Save failed");
          console.log(response?.message);
        }
      },
    );
  }

  if (markdown == null) {
    return <p>Loading notes...</p>;
  }

  return (
  <>
    <p role="status">{saveStatus}</p>
    <MDXEditor
      markdown={markdown}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <BoldItalicUnderlineToggles />
            </>
          ),
        }),
      ]}
      onChange={handleChange}
    />
  </>
  );
}
