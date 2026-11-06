import { Drawer, Tabs, Tab } from "@mui/material";
import { useState, useEffect, useRef, useCallback } from "react";
import SettingsPane from "../ui/SettingsPane.jsx";
import NotesPane from "../notes/NotesPane.jsx";
import { basesocket } from "../socket.io/socket";
import { useConnectionStatus } from "../../contexts/ConnectionContext.jsx";

export default function MenuPane(props) {
  const [activePane, setActivePane] = useState("settings");
  const handlePaneChange = (event, newValue) => {
    setActivePane(newValue);
  };

  const { baseConnected } = useConnectionStatus();
  const pendingNotes = useRef(null);
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

  const savePendingNotes = useCallback(() => {
    const markdown = pendingNotes.current;
    if (markdown == null) return;

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
          pendingNotes.current = null;
          setSaveStatus("Saved");
        } else {
          setSaveStatus("Save failed");
          console.log(response?.message);
        }
      });
  }, []);

  function handleNotesChange(markdown, markdownInitialize) {
    if (markdownInitialize) return;
    setMarkdown(markdown);
    pendingNotes.current = markdown;
    savePendingNotes();
  }

  useEffect(() => {
    if (baseConnected) {
      savePendingNotes();
    }
  }, [baseConnected, savePendingNotes]);

  return (
    <Drawer
      anchor="left"
      open={props.drawerOpen}
      onClose={props.toggleDrawer(false)}
      sx={{
        "& .MuiDrawer-paper": {
          width: activePane == "notes" ? "min(100vw, 420px)" : 240,
          borderRadius: "12px",
        },
      }}
    >
      <Tabs value={activePane} onChange={handlePaneChange}>
        <Tab label="Settings" value="settings"></Tab>
        <Tab label="Notes" value="notes"></Tab>
      </Tabs>
      {activePane == "settings" && <SettingsPane {...props} />}
      {activePane == "notes" && (
        <NotesPane
          markdown={markdown}
          saveStatus={saveStatus}
          loadError={loadError}
          onChange={handleNotesChange}
          onRetry={() => {
            setLoadError("");
            setLoadAttempt((attempt) => attempt + 1);
          }}
        />
      )}
    </Drawer>
  );
}
