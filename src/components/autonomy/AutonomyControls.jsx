// React hooks used for state, side effects, memoization, refs, and stable callbacks
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Material UI components used to build the interface
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";

// Global autonomy mode context
import { useAutonomyMode } from "../../contexts/AutonomyModeContext";

import { useGPS } from "../../contexts/GPSContext";
import { robotsocket } from "../socket.io/socket";

// Key used to store whether autonomy mode is enabled in localStorage
const AUTONOMY_STORAGE_KEY = "rover_autonomy_enabled";

// Target ids the rover uses for the two location cards
const TARGET_IDS = { location1: "Location 1", location2: "Location 2" };

// Initial state for the two drive locations
const initialDriveState = {
  location1: { label: "", lat: "", lon: "" },
  location2: { label: "", lat: "", lon: "" },
};

// Helper to generate a HH:MM:SS timestamp for history logs
const formatTimestamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

// Creates confetti for animation
const buildConfettiPieces = () =>
  Array.from({ length: 26 }).map((_, index) => ({
    id: `${Date.now()}-${index}`, // unique id for React rendering
    left: `${Math.random() * 100}%`, // random horizontal start position
    delay: `${Math.random() * 0.35}s`, // staggered animation delay
    duration: `${0.9 + Math.random() * 0.8}s`, // random animation duration
    rotate: `${Math.random() * 720 - 360}deg`, // random initial rotation
    color: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"][
      index % 6
    ], // cycle through preset colors
  }));

// Main exported component for rover autonomy controls
export default function AutonomyControls() {
  // Whether rover is currently in autonomous mode
  // The rover backend owns this state and shares it with every client
  const { autonomyState, autonomyEnabled, sendAutonomyCommand } = useAutonomyMode();
  const phase = autonomyState?.phase;
  const visitedTargetIds = autonomyState?.visitedTargetIds ?? [];

  // Navigation and typing can only start while the rover is stopped in autonomy
  const canStartTask = autonomyEnabled && (phase === "READY" || phase === "ARRIVED");
  const roverMoving = phase === "NAVIGATING" || phase === "RETURNING";

  // State controlling the start/stop autonomy confirmation dialogs
  const [startpopupOpen, startsetPopupOpen] = useState(false);
  const [endpopupOpen, endsetPopupOpen] = useState(false);

  // Which control tab is active: "drive" or "arm"
  const [activeTab, setActiveTab] = useState("drive");

  // Drive-related state
  // Location inputs being edited; sent to the rover on blur / Enter
  const [driveData, setDriveData] = useState(initialDriveState);
  const { robotCoordinates } = useGPS();
  const [lastCoords, setLastCoords] = useState({ lat: "___", lon: "___" });
  const driveStatus = autonomyState?.message || "Waiting for route.";

  // Keep the last GPS fix; receive goes false a few seconds after each fix
  useEffect(() => {
    if (robotCoordinates.receive) {
      setLastCoords({
        lat: robotCoordinates.lat.toFixed(6),
        lon: robotCoordinates.long.toFixed(6),
      });
    }
  }, [robotCoordinates]);

  // confetti UI state
  const [showArrival, setShowArrival] = useState(false);
  const [arrivalMessage, setArrivalMessage] = useState("");
  const [confettiPieces, setConfettiPieces] = useState([]);

  // Arm sequence state; the rover sends back what it has typed
  const [expectedSequence, setExpectedSequence] = useState("");
  const [armInput, setArmInput] = useState("");
  const typedProgress = autonomyState?.typing?.typed ?? "";
  const typingInProgress = phase === "TYPING";

  // History log for arm events, initialized with a startup message
  const [armHistory, setArmHistory] = useState(() => [
    `[${formatTimestamp()}] Waiting for launch key sequence.`,
  ]);

  // Ref for the history box so it can auto-scroll
  const historyRef = useRef(null);

  // Ref used to prevent celebration from firing repeatedly once success is reached
  const armSuccessCelebratedRef = useRef(false);

  // Previous phase, used to launch confetti only when the rover arrives
  const prevPhaseRef = useRef(phase);

  // Teleop controls are locked whenever autonomy mode is enabled
  // In this autonomy view, mission programming inputs stay available even while autonomy is active
  const teleopLocked = autonomyEnabled;

  // Auto-scroll arm history view to the bottom whenever new history is added
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [armHistory]);

  // Appends a timestamped message to arm history
  const addArmHistory = useCallback((message) => {
    setArmHistory((prev) => [...prev, `[${formatTimestamp()}] ${message}`]);
  }, []);

  // Adds the rover's autonomy log lines to the history
  useEffect(() => {
    const handler = ({ time, text }) => {
      setArmHistory((prev) => [...prev, `[${time}] ${text}`]);
    };
    robotsocket.on("autonomyLog", handler);
    return () => {
      robotsocket.off("autonomyLog", handler);
    };
  }, []);

  // Location input that has focus, as { locationKey, field }
  const focusedFieldRef = useRef(null);

  // Refill the location inputs whenever the rover's targets change
  // Skipped while disconnected so unsent edits aren't cleared
  const targetsJson = autonomyState ? JSON.stringify(autonomyState.targets) : null;
  useEffect(() => {
    if (targetsJson === null) return;
    const targets = JSON.parse(targetsJson);
    setDriveData((prev) => {
      const next = {};
      for (const [locationKey, id] of Object.entries(TARGET_IDS)) {
        const target = targets.find((t) => t.id === id);
        next[locationKey] = {
          label: target?.label ?? "",
          lat: target?.latitude != null ? String(target.latitude) : "",
          lon: target?.longitude != null ? String(target.longitude) : "",
        };
      }
      // don't overwrite the input the user is typing in; it is sent on blur
      const focused = focusedFieldRef.current;
      if (focused) {
        next[focused.locationKey][focused.field] = prev[focused.locationKey][focused.field];
      }
      return next;
    });
  }, [targetsJson]);

  // Keep the expected sequence the same on every client
  const serverExpected = autonomyState?.typing?.expected;
  useEffect(() => {
    if (serverExpected !== undefined) {
      setExpectedSequence(serverExpected);
    }
  }, [serverExpected]);

  // Starts a short confetti celebration, then clears it after 1.8s
  const launchConfetti = useCallback(() => {
    setConfettiPieces(buildConfettiPieces());

    setTimeout(() => {
      setConfettiPieces([]);
    }, 1800);
  }, []);

  // Confetti when the rover arrives at a location
  useEffect(() => {
    if (phase === "ARRIVED" && prevPhaseRef.current && prevPhaseRef.current !== "ARRIVED") {
      launchConfetti();
    }
    prevPhaseRef.current = phase;
  }, [phase, launchConfetti]);

  // Performs an immediate autonomy stop for minimize / hidden / page-exit situations
  // Stopping on the rover also stops any typing, and every client updates from the broadcast
  const hardStopAutonomy = useCallback(
    (reason = "window_hidden") => {
      if (!autonomyEnabled) return;

      setArrivalMessage("Autonomy hard-stopped.");
      setShowArrival(true);
      addArmHistory(`Autonomy hard-stopped (${reason}).`);

      sendAutonomyCommand("stopAutonomy");
    },
    [addArmHistory, autonomyEnabled, sendAutonomyCommand],
  );

  // Hard stop autonomy when the page becomes hidden or is being unloaded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hardStopAutonomy("document_hidden");
      }
    };

    const handlePageHide = () => {
      hardStopAutonomy("page_hide");
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hardStopAutonomy]);

  // Asks the rover to turn on autonomy mode; every client updates from the broadcast
  const startAutonomy = () => {
    sendAutonomyCommand("startAutonomy");
  };

  // Asks the rover to turn off autonomy mode
  const endAutonomy = () => {
    sendAutonomyCommand("stopAutonomy");
  };

  // Resets mission state back to defaults
  // The rover clears the targets, visited locations and typing for every client
  const restartMission = () => {
    if (teleopLocked) return;

    setShowArrival(false);
    setArrivalMessage("");
    setConfettiPieces([]);
    setLastCoords({ lat: "___", lon: "___" });
    setArmInput("");
    setArmHistory([
      `[${formatTimestamp()}] Mission restarted. Waiting for launch key sequence.`,
    ]);
    armSuccessCelebratedRef.current = false;
    setActiveTab("drive");

    sendAutonomyCommand("restartMission");
  };

  // Derives which step the rover is currently on
  const reached = {
    location1: visitedTargetIds.includes(TARGET_IDS.location1),
    location2: visitedTargetIds.includes(TARGET_IDS.location2),
  };
  const currentStep = reached.location2 ? 3 : reached.location1 ? 2 : 1;

  // Updates one field of one location card
  const handleLocationChange = (locationKey, field, value) => {
    setDriveData((prev) => ({
      ...prev,
      [locationKey]: {
        ...prev[locationKey],
        [field]: value,
      },
    }));
  };

  // Sends both locations to the rover, which shares them with every client
  const commitTargets = () => {
    sendAutonomyCommand("setTargets", {
      targets: Object.entries(TARGET_IDS).map(([locationKey, id]) => ({
        id,
        label: driveData[locationKey].label.trim(),
        latitude: driveData[locationKey].lat,
        longitude: driveData[locationKey].lon,
      })),
    });
  };

  const handleFieldFocus = (locationKey, field) => {
    focusedFieldRef.current = { locationKey, field };
  };

  const handleFieldBlur = () => {
    focusedFieldRef.current = null;
    commitTargets();
  };

  // Starts autonomous navigation to one location
  const handleGo = (locationKey) => {
    sendAutonomyCommand("goToTarget", { targetId: TARGET_IDS[locationKey] });
  };

  // Stops navigation where the rover is
  const handleAbort = () => {
    sendAutonomyCommand("abortAutonomy");
  };

  // Aborts and drives back to the last visited location (1.f.viii)
  const lastVisitedId = visitedTargetIds[visitedTargetIds.length - 1];
  const handleReturn = () => {
    sendAutonomyCommand("abortAutonomy", { returnToTargetId: lastVisitedId });
  };

  // Starts arm typing sequence from the entered input
  const handleArmEnter = () => {
    const typed = armInput.trim().toUpperCase();
    if (!typed) return;

    setArmInput("");
    sendAutonomyCommand("startTyping", { expected: expectedSequence, sequence: typed });
  };

  // Replays the most recent typed sequence
  const handleArmRedo = () => {
    const lastTyped = autonomyState?.typing?.sequence;
    if (!lastTyped) {
      addArmHistory("Nothing to redo yet.");
      return;
    }

    sendAutonomyCommand("startTyping", { expected: expectedSequence, sequence: lastTyped });
  };

  // Stops the rover's current typing
  const handleArmStop = () => {
    sendAutonomyCommand("stopTyping");
  };

  // Computes visual status boxes for each expected character
  const sequenceBoxes = useMemo(() => {
    const expected = expectedSequence.toUpperCase();
    const typed = typedProgress.toUpperCase();

    return expected.split("").map((char, index) => {
      const typedChar = typed[index];
      const isFilled = typeof typedChar === "string";
      const isCorrect = isFilled && typedChar === char;
      const isWrong = isFilled && typedChar !== char;

      return {
        id: `${char}-${index}`,
        expected: char,
        typed: typedChar || "",
        isCorrect,
        isWrong,
      };
    });
  }, [expectedSequence, typedProgress]);

  // Collects any extra typed characters beyond the expected length
  const extraTypedChars =
    typedProgress.length > expectedSequence.length
      ? typedProgress.slice(expectedSequence.length).split("")
      : [];

  // True only when every expected character matches and no extra input exists
  const allGreen =
    sequenceBoxes.length > 0 &&
    sequenceBoxes.every((item) => item.isCorrect) &&
    extraTypedChars.length === 0 &&
    typedProgress.length === expectedSequence.length;

  // When the full sequence is typed correctly, celebrate once
  useEffect(() => {
    if (allGreen && !armSuccessCelebratedRef.current) {
      addArmHistory("Launch key sequence typed correctly.");
      setArrivalMessage("Launch key sequence correct.");
      setShowArrival(true);
      launchConfetti();
      armSuccessCelebratedRef.current = true;
    }

    // Reset celebration guard if sequence is no longer fully correct
    if (!allGreen) {
      armSuccessCelebratedRef.current = false;
    }
  }, [addArmHistory, allGreen, launchConfetti]);

  // Main UI render
  return (
    <Box sx={{ width: "100%", maxWidth: 1100, position: "relative" }}>

      {/* Start autonomy confirmation dialog */}
      <StartPopup
        popupOpen={startpopupOpen}
        setPopupOpen={startsetPopupOpen}
        startAutonomy={startAutonomy}
      />

      {/* Stop autonomy confirmation dialog */}
      <EndPopup
        popupOpen={endpopupOpen}
        setPopupOpen={endsetPopupOpen}
        endAutonomy={endAutonomy}
      />

      {/* Top snackbar used for arrival / success messages */}
      <Snackbar
        open={showArrival}
        autoHideDuration={2200}
        onClose={() => setShowArrival(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowArrival(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {arrivalMessage}
        </Alert>
      </Snackbar>

      {/* Main card containing the whole control panel */}
      <Paper
        elevation={2}
        sx={{
          mt: 1.5,
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          position: "relative",
        }}
      >
        {/* Confetti overlay shown during celebrations */}
        {confettiPieces.length > 0 && <ConfettiOverlay pieces={confettiPieces} />}

        {/* Top header section with current mode and action buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1.5,
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            px: 2,
            pt: 2,
            pb: 1,
          }}
        >
          {/* Displays the rover mode: IDLE, TELEOPERATION or AUTONOMY */}
          <Paper
            variant="outlined"
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: 2,
              bgcolor: autonomyEnabled ? "grey.200" : "background.paper",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Current Mode
            </Typography>
            <Typography variant="subtitle1" fontWeight={800}>
              {autonomyState?.mode ?? "UNKNOWN"}
              {autonomyState?.phase ? ` / ${autonomyState.phase}` : ""}
            </Typography>
          </Paper>

          {/* Header action buttons */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>

            <Button
              variant="outlined"
              color="warning"
              onClick={restartMission}
              disabled={teleopLocked}
            >
              Restart Mission
            </Button>

            {/* Show either Start or Stop Autonomy depending on current mode */}
            {!autonomyEnabled ? (
              <Button
                variant="contained"
                onClick={() => startsetPopupOpen(true)}
                // only available when the rover reports something that can run autonomy
                disabled={!autonomyState?.source}
              >
                START AUTONOMY
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                onClick={() => endsetPopupOpen(true)}
              >
                STOP AUTONOMY
              </Button>
            )}
          </Box>
        </Box>

        {/* Helper text explaining whether teleop controls are available */}
        <Box
          sx={{
            px: 2,
            pb: 1.5,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {autonomyEnabled
              ? "Teleoperation views are disabled while the rover is working by itself, but location inputs and launch key inputs remain available here."
              : "Teleoperation controls are available."}
          </Typography>
        </Box>

        {/* Large arrival banner, shown on every client until the rover moves on */}
        {phase === "ARRIVED" && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Alert severity="success" variant="filled" sx={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {autonomyState.message}
            </Alert>
          </Box>
        )}

        {/* Tab buttons for switching between Drive and Arm panels */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 2,
            pt: 1,
            pb: 0,
            bgcolor: "#f6f8fb",
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button
            variant={activeTab === "drive" ? "contained" : "outlined"}
            onClick={() => setActiveTab("drive")}
            sx={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            Drive
          </Button>

          <Button
            variant={activeTab === "arm" ? "contained" : "outlined"}
            onClick={() => setActiveTab("arm")}
            sx={{
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            Arm
          </Button>
        </Box>

        {/* Main tab content area */}
        <Box sx={{ position: "relative" }}>
          <Box
            sx={{
              p: 2,
            }}
          >
            {/* Render the selected panel */}
            {activeTab === "drive" ? (
              <DrivePanel
                controlsLocked={false}
                driveData={driveData}
                reached={reached}
                lastCoords={lastCoords}
                currentStep={currentStep}
                driveStatus={driveStatus}
                activeTargetId={autonomyState?.activeTargetId}
                phase={phase}
                canStartTask={canStartTask}
                roverMoving={roverMoving}
                lastVisitedId={lastVisitedId}
                onAbort={handleAbort}
                onReturn={handleReturn}
                onLocationChange={handleLocationChange}
                onCommitTargets={commitTargets}
                onFieldFocus={handleFieldFocus}
                onFieldBlur={handleFieldBlur}
                onGo={handleGo}
              />
            ) : (
              <ArmPanel
                controlsLocked={false}
                canStartTyping={canStartTask}
                typingInProgress={typingInProgress}
                expectedSequence={expectedSequence}
                setExpectedSequence={setExpectedSequence}
                armInput={armInput}
                setArmInput={setArmInput}
                armHistory={armHistory}
                historyRef={historyRef}
                sequenceBoxes={sequenceBoxes}
                extraTypedChars={extraTypedChars}
                onEnter={handleArmEnter}
                onRedo={handleArmRedo}
                onStop={handleArmStop}
              />
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

// Drive tab content
function DrivePanel({
  controlsLocked,
  driveData,
  reached,
  lastCoords,
  currentStep,
  driveStatus,
  activeTargetId,
  phase,
  canStartTask,
  roverMoving,
  lastVisitedId,
  onAbort,
  onReturn,
  onLocationChange,
  onCommitTargets,
  onFieldFocus,
  onFieldBlur,
  onGo,
}) {
  // Props shared by both location cards
  const cardProps = (locationKey) => {
    const data = driveData[locationKey];
    const id = TARGET_IDS[locationKey];
    const active = roverMoving && activeTargetId === id;
    return {
      // targets can be reprogrammed only while the rover is stopped (1.f.ix)
      controlsLocked: controlsLocked || roverMoving,
      title: data.label ? `${id} - ${data.label}` : id,
      data,
      reached: reached[locationKey],
      goLabel: active ? (phase === "RETURNING" ? "Returning" : "Navigating") : "Go",
      canGo: canStartTask && data.lat !== "" && data.lon !== "",
      onChange: (field, value) => onLocationChange(locationKey, field, value),
      onCommit: onCommitTargets,
      onFocusField: (field) => onFieldFocus(locationKey, field),
      onBlurField: onFieldBlur,
      onGo: () => onGo(locationKey),
    };
  };

  return (
    <Box>
      {/* Top row with Abort / Return buttons and live rover coordinates */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="error"
            onClick={onAbort}
            disabled={controlsLocked || !roverMoving}
          >
            Abort
          </Button>

          {/* Abort and drive back to the last visited location */}
          <Button
            variant="outlined"
            color="error"
            onClick={onReturn}
            disabled={controlsLocked || !roverMoving || !lastVisitedId}
          >
            {lastVisitedId ? `Return to ${lastVisitedId}` : "Return"}
          </Button>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            px: 2,
            py: 1.5,
            minWidth: 250,
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Last Coords
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            {lastCoords.lat}, {lastCoords.lon}
          </Typography>
        </Paper>
      </Box>

      {/* Drive status message */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2,
          borderRadius: 2,
          bgcolor: "#f8fbff",
        }}
      >
        <Typography fontWeight={600}>{driveStatus}</Typography>
      </Paper>

      {/* Two-column layout: step tracker on left, location cards on right */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "180px 1fr" },
          gap: 2,
        }}
      >
        {/* Vertical step indicator */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minHeight: 260,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Step #{currentStep}
          </Typography>

          <Box
            sx={{
              mt: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Dot for location 1 */}
            <StepDot active={reached.location1} />

            {/* Vertical connecting line */}
            <Box
              sx={{
                width: 4,
                height: 130,
                bgcolor: reached.location1 ? "success.main" : "grey.300",
                borderRadius: 999,
                my: 0.5,
              }}
            />

            {/* Dot for location 2 */}
            <StepDot active={reached.location2} />
          </Box>

          {/* Reserved layout space under the step indicator */}
          <Box
            sx={{
              mt: 2,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 7,
              textAlign: "center",
            }}
          />
        </Paper>

        {/* Location editor cards */}
        <Box sx={{ display: "grid", gap: 2 }}>
          <LocationCard {...cardProps("location1")} />

          <LocationCard {...cardProps("location2")} />
        </Box>
      </Box>
    </Box>
  );
}

// Arm tab content
function ArmPanel({
  controlsLocked,
  canStartTyping,
  typingInProgress,
  expectedSequence,
  setExpectedSequence,
  armInput,
  setArmInput,
  armHistory,
  historyRef,
  sequenceBoxes,
  extraTypedChars,
  onEnter,
  onRedo,
  onStop,
}) {
  return (
    <Box>
      {/* Form for entering expected sequence and typing queue */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault(); // prevent page reload
            onEnter();
          }}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto auto auto" },
            gap: 1.5,
            alignItems: "end",
          }}
        >
          {/* Expected target sequence */}
          <TextField
            label="Expected Sequence"
            value={expectedSequence}
            onChange={(e) => setExpectedSequence(e.target.value.toUpperCase())}
            placeholder="ENTER"
            fullWidth
            disabled={controlsLocked}
          />

          {/* Sequence the rover will simulate typing */}
          <TextField
            label="Typing Queue"
            value={armInput}
            onChange={(e) => setArmInput(e.target.value.toUpperCase())}
            placeholder="Type multiple characters"
            fullWidth
            disabled={controlsLocked || typingInProgress}
          />

          {/* Submit typed sequence */}
          <Button
            type="submit"
            variant="contained"
            disabled={controlsLocked || !canStartTyping}
          >
            Enter
          </Button>

          {/* Replay last sequence */}
          <Button
            variant="outlined"
            onClick={onRedo}
            disabled={controlsLocked || !canStartTyping}
          >
            Redo
          </Button>

          {/* Stop in-progress typing */}
          <Button
            variant="contained"
            color="error"
            onClick={onStop}
            disabled={controlsLocked || !typingInProgress}
          >
            Stop
          </Button>
        </Box>
      </Paper>

      {/* Visual sequence comparison area */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Launch Key Sequence Status
        </Typography>

        <Divider sx={{ mb: 1.5 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Green = correct character, red = incorrect character.
        </Typography>

        {/* Main expected-sequence comparison boxes */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: extraTypedChars.length ? 2 : 0,
          }}
        >
          {sequenceBoxes.map((item) => (
            <Box
              key={item.id}
              sx={{
                width: 58,
                height: 64,
                borderRadius: 2,
                border: "2px solid",
                borderColor: item.isCorrect
                  ? "success.main"
                  : item.isWrong
                    ? "error.main"
                    : "grey.400",
                bgcolor: item.isCorrect
                  ? "success.light"
                  : item.isWrong
                    ? "error.light"
                    : "grey.100",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              <Typography variant="h6" fontWeight={800}>
                {item.expected}
              </Typography>
              <Typography variant="caption">
                {item.typed ? `typed ${item.typed}` : "waiting"}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Shows any extra characters typed beyond the expected sequence */}
        {extraTypedChars.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
              Extra Input
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {extraTypedChars.map((char, index) => (
                <Box
                  key={`${char}-${index}`}
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: "error.main",
                    bgcolor: "error.light",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                  }}
                >
                  {char}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Scrollable history log */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Typing History
        </Typography>

        <Divider sx={{ mb: 1.5 }} />

        <Box
          ref={historyRef}
          sx={{
            height: 130,
            overflowY: "scroll",
            pr: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {armHistory.map((item, index) => (
            <Typography key={index} variant="body2">
              {item}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

// Card for editing a single target location
function LocationCard({
  controlsLocked,
  title,
  data,
  reached,
  goLabel,
  canGo,
  onChange,
  onCommit,
  onFocusField,
  onBlurField,
  onGo,
}) {
  // Shared input props: edits are sent to the rover on blur or Enter
  const fieldProps = (field) => ({
    value: data[field],
    onChange: (e) => onChange(field, e.target.value),
    onFocus: () => onFocusField(field),
    onBlur: onBlurField,
    onKeyDown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onCommit();
      }
    },
    fullWidth: true,
    disabled: controlsLocked,
  });

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      {/* Header row with title and reached button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
          flexDirection: { xs: "column", sm: "row" },
          mb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Set by the rover when it arrives here */}
          {reached && (
            <Typography color="success.main" fontWeight={700}>
              Reached
            </Typography>
          )}
          <Button variant="contained" onClick={onGo} disabled={!canGo}>
            {goLabel}
          </Button>
        </Box>
      </Box>

      {/* Inputs for label, latitude, and longitude */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        <TextField label="Label" {...fieldProps("label")} />

        <TextField label="Lat" {...fieldProps("lat")} />

        <TextField label="Long" {...fieldProps("lon")} />
      </Box>
    </Paper>
  );
}

// Small circular step indicator used in the drive progress tracker
function StepDot({ active }) {
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        border: "3px solid",
        borderColor: active ? "success.main" : "grey.400",
        bgcolor: active ? "success.main" : "common.white",
      }}
    />
  );
}

// Full-screen confetti overlay drawn on top of the panel
function ConfettiOverlay({ pieces }) {
  return (
    <Box
      sx={{
        pointerEvents: "none", // allows clicks to pass through
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 5,

        // CSS animation definition for falling confetti
        "@keyframes confetti-drop": {
          "0%": {
            transform: "translateY(-40px) rotate(0deg)",
            opacity: 1,
          },
          "100%": {
            transform: "translateY(360px) rotate(540deg)",
            opacity: 0,
          },
        },
      }}
    >
      {/* Render one small animated rectangle for each confetti piece */}
      {pieces.map((piece) => (
        <Box
          key={piece.id}
          sx={{
            position: "absolute",
            top: -20,
            left: piece.left,
            width: 10,
            height: 18,
            borderRadius: "2px",
            bgcolor: piece.color,
            animationName: "confetti-drop",
            animationTimingFunction: "ease-out",
            animationFillMode: "forwards",
            animationDuration: piece.duration,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotate})`,
          }}
        />
      ))}
    </Box>
  );
}

// Confirmation dialog shown before enabling autonomy mode
export function StartPopup({ setPopupOpen, popupOpen, startAutonomy }) {
  return (
    <Dialog
      open={popupOpen}
      onClose={() => setPopupOpen(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {"Start Autonomous Mode?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Drive, Arm, and Science will be unavailable. Ready to begin?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {/* Close without action */}
        <Button onClick={() => setPopupOpen(false)}>CANCEL</Button>

        {/* Confirm and start autonomy */}
        <Button
          onClick={() => {
            setPopupOpen(false);
            startAutonomy();
          }}
          autoFocus
        >
          START AUTONOMY
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Confirmation dialog shown before disabling autonomy mode
export function EndPopup({ setPopupOpen, popupOpen, endAutonomy }) {
  return (
    <Dialog
      open={popupOpen}
      onClose={() => setPopupOpen(false)}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {"Kill Autonomous Mode?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          You should only stop autonomous mode in emergency situations. Are you
          sure you want to proceed?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {/* Close without action */}
        <Button onClick={() => setPopupOpen(false)}>CANCEL</Button>

        {/* Confirm and stop autonomy */}
        <Button
          onClick={() => {
            setPopupOpen(false);
            endAutonomy();
          }}
          autoFocus
        >
          KILL AUTONOMY
        </Button>
      </DialogActions>
    </Dialog>
  );
}
