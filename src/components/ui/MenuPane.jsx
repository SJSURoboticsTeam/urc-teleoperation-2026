import { Drawer, Tabs, Tab } from "@mui/material";
import { useState, useEffect, useRef, useCallback } from "react";
import SettingsPane from "../ui/SettingsPane.jsx";
import NotesPane from "../notes/NotesPane.jsx";
import { basesocket } from "../socket.io/socket";
import { useConnectionStatus } from "../../contexts/ConnectionContext.jsx";

const AUTOSAVE_DEBOUNCE_MS = 500;
const RETRY_DELAY_MS = [1000, 2000];

export default function MenuPane(props) {
  const [activePane, setActivePane] = useState("settings");
  const handlePaneChange = (event, newValue) => {
    setActivePane(newValue);
  };

  const { baseConnected } = useConnectionStatus();
  const pendingNotes = useRef(null);
  const latestSave = useRef(0);
  const saveTimer = useRef(null);
  const currentlySaving = useRef(false);
  const retryCount = useRef(0);
  const [markdown, setMarkdown] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
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

  const savePendingNotes = useCallback(function flushPendingNotes() {
    if (currentlySaving.current) return;

    const markdown = pendingNotes.current;
    if (markdown == null) return;

    const requestId = ++latestSave.current;

    if (!basesocket.connected) {
      setSaveStatus("Unsaved: base-pi disconnected");
      return;
    }

    currentlySaving.current = true;

    setSaveStatus("Saving...");

    basesocket
      .timeout(3000)
      .emit("saveNotes", { markdown }, (err, response) => {
        currentlySaving.current = false;
        if (requestId != latestSave.current) {
          if (saveTimer.current == null && basesocket.connected) {
            flushPendingNotes();
          }
          return;
        }

        if (err) {
          if (!basesocket.connected) {
            setSaveStatus("Unsaved: base-pi disconnected");
            return;
          }

          const retryDelay = RETRY_DELAY_MS[retryCount.current];
          if (retryDelay === undefined) {
            setSaveStatus("Save unconfirmed: automatic retries exhausted");
            return;
          }

          retryCount.current += 1;
          setSaveStatus(
            `Save unconfirmed: retry ${retryCount.current} scheduled`,
          );

          saveTimer.current = setTimeout(() => {
            saveTimer.current = null;
            flushPendingNotes();
          }, retryDelay);
        } else if (response?.status == "OK") {
          retryCount.current = 0;
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
    retryCount.current = 0;

    ++latestSave.current;
    setMarkdown(markdown);
    pendingNotes.current = markdown;
    clearTimeout(saveTimer.current);

    if (!basesocket.connected) {
      setSaveStatus("Unsaved: base-pi disconnected");
      return;
    }

    setSaveStatus("Unsaved");

    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      savePendingNotes();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    retryCount.current = 0;

    if (baseConnected) {
      savePendingNotes();
    }

    return () => {
      clearTimeout(saveTimer.current);
    };
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
