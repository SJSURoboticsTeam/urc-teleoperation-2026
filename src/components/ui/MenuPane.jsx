import { Drawer, Tabs, Tab } from "@mui/material";
import { useState, useEffect, useRef, useCallback } from "react";
import SettingsPane from "../ui/SettingsPane.jsx";
import NotesPane from "../notes/NotesPane.jsx";
import { basesocket } from "../socket.io/socket";
import { useConnectionStatus } from "../../contexts/ConnectionContext.jsx";

const GET_NOTES_TIMEOUT_MS = 3000;
const SAVE_NOTES_TIMEOUT_MS = 3000;
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
  const serverRevision = useRef(-1);
  const latestServerNotes = useRef(null);
  const [markdown, setMarkdown] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [refreshError, setRefreshError] = useState("");

  const receiveNotes = useCallback((notes) => {
    if (
      typeof notes?.markdown !== "string" ||
      !Number.isSafeInteger(notes?.revision) ||
      notes.revision < 0
    ) {
      return false;
    }

    setRefreshError("");

    if (notes.revision > serverRevision.current) {
      serverRevision.current = notes.revision;
      latestServerNotes.current = notes;
    }

    const latest = latestServerNotes.current;

    if (latest && pendingNotes.current == null && !currentlySaving.current) {
      setMarkdown(latest.markdown);
      setLoadError("");
      setSaveStatus("Saved");
    }

    return true;
  }, []);

  useEffect(() => {
    function handleNotesUpdated(notes) {
      if (!receiveNotes(notes)) {
        console.log("Invalid notes update");
      }
    }

    basesocket.on("notesUpdated", handleNotesUpdated);

    return () => {
      basesocket.off("notesUpdated", handleNotesUpdated);
    };
  }, [receiveNotes]);

  useEffect(() => {
    if (!baseConnected || !basesocket.connected) return;

    let active = true;
    let retryTimer = null;
    let loadRetries = 0;

    function reportError(message) {
      if (latestServerNotes.current === null) {
        setLoadError(message);
      } else {
        setRefreshError(`Refresh failed: ${message}`);
      }
    }

    function loadNotes() {
      if (!active || !basesocket.connected) return;

      basesocket
        .timeout(GET_NOTES_TIMEOUT_MS)
        .emit("getNotes", (err, response) => {
          if (!active || !basesocket.connected) return;

          if (err) {
            const delay = RETRY_DELAY_MS[loadRetries];

            if (delay !== undefined) {
              loadRetries += 1;
              retryTimer = setTimeout(loadNotes, delay);
              return;
            }

            reportError("Notes request timed out after 3 attempts");
            return;
          }

          if (response?.status !== "OK") {
            reportError(response?.message ?? "Could not load notes");
            return;
          }

          if (!receiveNotes(response)) {
            reportError("Invalid notes snapshot");
          }
        });
    }

    loadNotes();

    return () => {
      active = false;
      clearTimeout(retryTimer);
    };
  }, [loadAttempt, receiveNotes, baseConnected]);

  const savePendingNotes = useCallback(
    function flushPendingNotes() {
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
        .timeout(SAVE_NOTES_TIMEOUT_MS)
        .emit("saveNotes", { markdown }, (err, response) => {
          currentlySaving.current = false;

          const validSnapshot =
            !err && response?.status == "OK" && receiveNotes(response);

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
          } else if (validSnapshot) {
            retryCount.current = 0;
            pendingNotes.current = null;
            receiveNotes(response);
          } else {
            setSaveStatus("Save failed");
            console.log(response?.message);
          }
        });
    },
    [receiveNotes],
  );

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
          refreshError={refreshError}
        />
      )}
    </Drawer>
  );
}
