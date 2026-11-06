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
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

export default function NotesPane() {
  const [markdown, setMarkdown] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const latestSave = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    basesocket.timeout(3000).emit("getNotes", (err, response) => {
      if (!active) return; // prevent late load

      if (err || response?.status != "OK") {
        setLoadError(
          err
            ? "Loading notes timed out"
            : (response?.message ?? "Could not load notes"),
        );
        return;
      }

      setMarkdown(response.markdown);
    });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  function handleChange(markdown, markdownInitialize) {
    if (markdownInitialize) return;

    const requestId = ++latestSave.current;

    if (!basesocket.connected) {
      setSaveStatus("Unsaved: base-pi disconnected");
      return;
    }

    setSaveStatus("Saving...");

    basesocket
      .timeout(3000)
      .emit("saveNotes", { markdown }, (err, response) => {
        if (requestId != latestSave.current) return;

        if (err) {
          setSaveStatus("Save unconfirmed: request timed out");
        } else if (response?.status == "OK") {
          setSaveStatus("Saved");
        } else {
          setSaveStatus("Save failed");
          console.log(response?.message);
        }
      });
  }

  if (loadError) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          p: 2,
          gap: 1,
        }}
      >
        <p role="alert">{loadError}</p>
        <Button
          variant="contained"
          onClick={() => {
            setLoadError("");
            setLoadAttempt((attempt) => attempt + 1);
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (markdown == null) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <p>Loading notes...</p>
      </Box>
    );
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
