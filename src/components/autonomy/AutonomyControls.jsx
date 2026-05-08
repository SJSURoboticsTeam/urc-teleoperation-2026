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

// Key used to store whether autonomy mode is enabled in localStorage
const AUTONOMY_STORAGE_KEY = "rover_autonomy_enabled";

// Initial state for the two drive locations
const initialDriveState = {
  location1: { label: "", lat: "", lon: "", reached: false },
  location2: { label: "", lat: "", lon: "", reached: false },
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
  // State is now shared globally so all views can react to it
  const { autonomyEnabled, setAutonomyEnabled } = useAutonomyMode();

  // State controlling the start/stop autonomy confirmation dialogs
  const [startpopupOpen, startsetPopupOpen] = useState(false);
  const [endpopupOpen, endsetPopupOpen] = useState(false);

  // Which control tab is active: "drive" or "arm"
  const [activeTab, setActiveTab] = useState("drive");

  // Drive-related state
  const [driveData, setDriveData] = useState(initialDriveState);
  const [lastCoords, setLastCoords] = useState({ lat: "___", lon: "___" });
  const [driveStatus, setDriveStatus] = useState("Waiting for route.");

  // confetti UI state
  const [showArrival, setShowArrival] = useState(false);
  const [arrivalMessage, setArrivalMessage] = useState("");
  const [confettiPieces, setConfettiPieces] = useState([]);

  // Arm sequence / typing simulation state
  const [expectedSequence, setExpectedSequence] = useState("");
  const [armInput, setArmInput] = useState("");
  const [lastTyped, setLastTyped] = useState("");
  const [typedProgress, setTypedProgress] = useState("");
  const [typingInProgress, setTypingInProgress] = useState(false);

  // History log for arm events, initialized with a startup message
  const [armHistory, setArmHistory] = useState(() => [
    `[${formatTimestamp()}] Waiting for launch key sequence.`,
  ]);

  // Ref used to hold the active interval for typing simulation
  const typingIntervalRef = useRef(null);

  // Ref for the history box so it can auto-scroll
  const historyRef = useRef(null);

  // Ref used to prevent celebration from firing repeatedly once success is reached
  const armSuccessCelebratedRef = useRef(false);

  // Teleop controls are locked whenever autonomy mode is enabled
  // In this autonomy view, mission programming inputs stay available even while autonomy is active
  const teleopLocked = autonomyEnabled;

  // Auto-scroll arm history view to the bottom whenever new history is added
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [armHistory]);

  // Cleanup typing interval when component unmounts
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Stops the typing simulation and clears the interval
  const stopTypingAnimation = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setTypingInProgress(false);
  }, []);

  // Appends a timestamped message to arm history
  const addArmHistory = useCallback((message) => {
    setArmHistory((prev) => [...prev, `[${formatTimestamp()}] ${message}`]);
  }, []);

  // Starts a short confetti celebration, then clears it after 1.8s
  const launchConfetti = useCallback(() => {
    setConfettiPieces(buildConfettiPieces());

    setTimeout(() => {
      setConfettiPieces([]);
    }, 1800);
  }, []);

  // Placeholder for backend communication
  // Currently just logs to console
  const sendCommandToBackend = (payload) => {
    console.log("Sending command to backend:", payload);
    // TODO: replace with actual API call (fetch/axios)
  };

  // Performs an immediate autonomy stop for minimize / hidden / page-exit situations
  const hardStopAutonomy = useCallback(
    (reason = "window_hidden") => {
      if (!autonomyEnabled) return;

      stopTypingAnimation();
      setAutonomyEnabled(false);
      setDriveStatus("Autonomy hard-stopped.");
      setArrivalMessage("Autonomy hard-stopped.");
      setShowArrival(true);
      addArmHistory(`Autonomy hard-stopped (${reason}).`);

      sendCommandToBackend({ type: "arm_stop", reason });
      sendCommandToBackend({ type: "autonomy_hard_stop", reason });
    },
    [
      addArmHistory,
      autonomyEnabled,
      setAutonomyEnabled,
      stopTypingAnimation,
    ],
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

  // Simulates the rover typing a sequence one character at a time
  const startTypingAnimation = useCallback(
    (sequence) => {
      stopTypingAnimation(); // ensure no previous typing loop is running
      setTypingInProgress(true);
      setTypedProgress("");

      let index = 0;
      const normalized = sequence.toUpperCase();

      typingIntervalRef.current = setInterval(() => {
        const nextChar = normalized[index];

        // Add next character to visible progress
        setTypedProgress((prev) => prev + nextChar);

        // Log it to history
        addArmHistory(`ROVER typed ${nextChar}`);

        // Simulate sending each typed character to backend
        sendCommandToBackend({ type: "arm_input_char", value: nextChar });

        index += 1;

        // Stop interval once all characters have been typed
        if (index >= normalized.length) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
          setTypingInProgress(false);
          addArmHistory(`ROVER finished typing ${normalized}`);
        }
      }, 700);
    },
    [addArmHistory, stopTypingAnimation],
  );

  // Turns on autonomy mode
  const startAutonomy = () => {
    setAutonomyEnabled(true);
    setDriveStatus("Autonomy started.");
    sendCommandToBackend({ type: "autonomy_start" });
  };

  // Turns off autonomy mode
  const endAutonomy = () => {
    setAutonomyEnabled(false);
    setDriveStatus("Autonomy stopped.");
    sendCommandToBackend({ type: "autonomy_stop" });
  };

  // Opens the Arm tab and logs a USB task start
  const startUsb = () => {
    if (teleopLocked) return;
    setActiveTab("arm");
    addArmHistory("USB task started.");
    sendCommandToBackend({ type: "usb_start" });
  };

  // Resets mission state back to defaults
  const restartMission = () => {
    if (teleopLocked) return;

    stopTypingAnimation();
    setDriveData(initialDriveState);
    setLastCoords({ lat: "___", lon: "___" });
    setDriveStatus("Mission restarted.");
    setShowArrival(false);
    setArrivalMessage("");
    setConfettiPieces([]);
    setTypedProgress("");
    setArmInput("");
    setLastTyped("");
    setArmHistory([
      `[${formatTimestamp()}] Mission restarted. Waiting for launch key sequence.`,
    ]);
    armSuccessCelebratedRef.current = false;
    setActiveTab("drive");

    sendCommandToBackend({ type: "restart_mission" });
  };

  // Derives which step the rover is currently on
  const currentStep = driveData.location2.reached
    ? 3
    : driveData.location1.reached
      ? 2
      : 1;

  // Updates one field of one location card
  const handleLocationChange = (locationKey, field, value) => {
    setDriveData((prev) => ({
      ...prev,
      [locationKey]: {
        ...prev[locationKey],
        [field]: value,
      },
    }));

    // Forward location edits even while autonomy is enabled
    sendCommandToBackend({
      type: "location_input_update",
      location: locationKey,
      field,
      value,
    });
  };

  // Shows success toast and confetti for arriving at a location
  const triggerArrival = (locationName) => {
    setArrivalMessage(`Arrived at ${locationName}`);
    setShowArrival(true);
    launchConfetti();
  };

  // Toggles whether a location has been reached
  const handleReachedToggle = (locationKey) => {
    const currentLocation = driveData[locationKey];
    const nextReached = !currentLocation.reached;

    // Fallback label if user has not given the location a custom name
    const fallbackLabel =
      locationKey === "location1" ? "Location 1" : "Location 2";
    const displayLabel = currentLocation.label?.trim() || fallbackLabel;

    // Update reached state
    setDriveData((prev) => ({
      ...prev,
      [locationKey]: {
        ...prev[locationKey],
        reached: nextReached,
      },
    }));

    if (nextReached) {
      // When reached, store coords, update status, show celebration, notify backend
      setLastCoords({
        lat: currentLocation.lat || "___",
        lon: currentLocation.lon || "___",
      });
      setDriveStatus(`${displayLabel} reached.`);
      triggerArrival(displayLabel);
      sendCommandToBackend({
        type: "location_reached",
        location: locationKey,
        label: displayLabel,
      });
    } else {
      // If toggled back off, mark the location as pending again
      setDriveStatus(`${displayLabel} marked pending.`);
      sendCommandToBackend({
        type: "location_pending",
        location: locationKey,
        label: displayLabel,
      });
    }
  };

  // Opens abort confirmation dialog
  const handleAbort = () => {
    endsetPopupOpen(true);
  };

  // Starts arm typing sequence from the entered input
  const handleArmEnter = () => {
    const typed = armInput.trim().toUpperCase();
    if (!typed) return;

    setLastTyped(typed);
    setArmInput("");
    addArmHistory(`Starting typed sequence ${typed}`);
    sendCommandToBackend({ type: "arm_input_sequence", value: typed });
    startTypingAnimation(typed);
  };

  // Replays the most recent typed sequence
  const handleArmRedo = () => {
    if (!lastTyped) {
      addArmHistory("Nothing to redo yet.");
      return;
    }

    addArmHistory(`Redo typing ${lastTyped}`);
    sendCommandToBackend({ type: "arm_input_redo", value: lastTyped });
    startTypingAnimation(lastTyped);
  };

  // Stops the current typing simulation
  const handleArmStop = () => {
    stopTypingAnimation();
    addArmHistory("Typing stopped.");
    sendCommandToBackend({ type: "arm_stop" });
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
          {/* Displays whether rover is in TELEOP or AUTONOMY */}
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
              {autonomyEnabled ? "AUTONOMY" : "TELEOP"}
            </Typography>
          </Paper>

          {/* Header action buttons */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={startUsb}
              disabled={teleopLocked}
            >
              Start USB
            </Button>

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
              <Button variant="contained" onClick={() => startsetPopupOpen(true)}>
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
                lastCoords={lastCoords}
                currentStep={currentStep}
                driveStatus={driveStatus}
                onAbort={handleAbort}
                onLocationChange={handleLocationChange}
                onReachedToggle={handleReachedToggle}
              />
            ) : (
              <ArmPanel
                controlsLocked={false}
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
  lastCoords,
  currentStep,
  driveStatus,
  onAbort,
  onLocationChange,
  onReachedToggle,
}) {
  return (
    <Box>
      {/* Top row with Abort button and last-known coordinates */}
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
        <Button
          variant="contained"
          color="error"
          onClick={onAbort}
          disabled={controlsLocked}
        >
          Abort
        </Button>

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
            <StepDot active={driveData.location1.reached} />

            {/* Vertical connecting line */}
            <Box
              sx={{
                width: 4,
                height: 130,
                bgcolor: driveData.location1.reached ? "success.main" : "grey.300",
                borderRadius: 999,
                my: 0.5,
              }}
            />

            {/* Dot for location 2 */}
            <StepDot active={driveData.location2.reached} />
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
          <LocationCard
            controlsLocked={controlsLocked}
            title={
              driveData.location1.label
                ? `Location 1 - ${driveData.location1.label}`
                : "Location 1"
            }
            data={driveData.location1}
            onChange={(field, value) =>
              onLocationChange("location1", field, value)
            }
            onReachedToggle={() => onReachedToggle("location1")}
          />

          <LocationCard
            controlsLocked={controlsLocked}
            title={
              driveData.location2.label
                ? `Location 2 - ${driveData.location2.label}`
                : "Location 2"
            }
            data={driveData.location2}
            onChange={(field, value) =>
              onLocationChange("location2", field, value)
            }
            onReachedToggle={() => onReachedToggle("location2")}
          />
        </Box>
      </Box>
    </Box>
  );
}

// Arm tab content
function ArmPanel({
  controlsLocked,
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
            disabled={controlsLocked || typingInProgress}
          >
            Enter
          </Button>

          {/* Replay last sequence */}
          <Button
            variant="outlined"
            onClick={onRedo}
            disabled={controlsLocked || typingInProgress}
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
                width: 52,
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
function LocationCard({ controlsLocked, title, data, onChange, onReachedToggle }) {
  // Local input state for the label field
  // This allows controlled editing before committing changes
  const [labelInput, setLabelInput] = useState(data.label);

  // Keep local label input in sync if parent data changes
  useEffect(() => {
    setLabelInput(data.label);
  }, [data.label]);

  // Commit the current label input back to parent state
  const commitLabel = () => {
    onChange("label", labelInput);
  };

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

        <Button
          variant={data.reached ? "contained" : "outlined"}
          color={data.reached ? "success" : "primary"}
          onClick={onReachedToggle}
          disabled={controlsLocked}
        >
          {data.reached ? "Reached" : "Mark Reached"}
        </Button>
      </Box>

      {/* Inputs for label, latitude, and longitude */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        <TextField
          label="Label"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            // Commit label change when Enter is pressed
            if (e.key === "Enter") {
              e.preventDefault();
              commitLabel();
            }
          }}
          fullWidth
          disabled={controlsLocked}
        />

        <TextField
          label="Lat"
          value={data.lat}
          onChange={(e) => onChange("lat", e.target.value)}
          fullWidth
          disabled={controlsLocked}
        />

        <TextField
          label="Long"
          value={data.lon}
          onChange={(e) => onChange("lon", e.target.value)}
          fullWidth
          disabled={controlsLocked}
        />
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
          You are about to start autonomous mode. All controllers will be
          disconnected.
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
