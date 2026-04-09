import { useState, useRef, useEffect } from "react";
import "react-resizable/css/styles.css";
import { Typography, Box, Slider, Button } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { FrameRateConstant } from "../components/gamepad/FrameRateConstant";
import { useRobotSocketStatus, robotsocket } from "../components/socket.io/socket";
import { useArmCommands } from "../contexts/ArmCommandContext";
import { useConnectedGamepads } from "../contexts/GamepadContext";

const ARM_JOINT_KEYS = [
  "track", 
  "shoulder", 
  "elbow", 
  "pitch", 
  "roll", 
  "clamp"
];

const ARM_JOINT_CONFIG = [
  { label: "Elbow (deg)", key: "elbow", min: -100, max: -20 },
  { label: "Shoulder (deg)", key: "shoulder", min: -20, max: 65 },
  { label: "Track (mm)", key: "track", min: 0, max: 300 },
  { label: "Pitch (deg)", key: "pitch", min: 0, max: 180 },
  { label: "Roll (deg)", key: "roll", min: 0, max: 360 },
  { label: "Clamp", key: "clamp", min: 0, max: 20 },
];

// View for arm controls, handles both manual slider input and gamepad input (if connected)
export default function ArmView() {
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads] = useConnectedGamepads();
  const armConnectedOne = connectedGamepads.arm;
  const serverConnected = useRobotSocketStatus();

  const [txon, settxon] = useState(false);
  const [txPulse, setTxPulse] = useState(false);
  const [recentlyChanged, setRecentlyChanged] = useState({});

  const armCommandsRef = useRef(armCommands);
  const prevArmCommandsRef = useRef(armCommands);
  const prevDisplayCommandsRef = useRef(armCommands);
  const pulseTimeoutsRef = useRef({});
  const txPulseTimeoutRef = useRef(null);

  const [armFeedback, setArmFeedback] = useState({
    track: null,
    shoulder: null,
    elbow: null,
    pitch: null,
    roll: null,
    clamp: null,
  });

  const gamepadMode = armConnectedOne != null;
  const controlModeLabel = gamepadMode ? "Gamepad Control" : "Slider Control";
  const sendModeLabel = gamepadMode ? "Auto" : txon ? "Auto" : "Manual";

  useEffect(() => {
    armCommandsRef.current = armCommands;
  }, [armCommands]);

  // When no arm gamepad is selected, initialize manual controls to
  // their default test ranges so the sliders and displayed values match
  useEffect(() => {
    if (armConnectedOne == null) {
      setArmCommands({
        elbow: -100,
        shoulder: -20,
        track: 0,
        pitch: 0,
        roll: 0,
        clamp: 0,
      });
    }
  }, [armConnectedOne, setArmCommands]);

  // Gamepad mode always uses auto send
  useEffect(() => {
    if (gamepadMode && !txon) {
      settxon(true);
    }
  }, [gamepadMode, txon]);

  // AUTO TX: emit only joints whose values changed since the last interval
  // This works for both slider mode and gamepad mode
  useEffect(() => {
    if (!serverConnected || !txon) return;

    console.log("[ARM] Starting auto TX (changed joints only)");

    const intervalId = setInterval(() => {
      const current = armCommandsRef.current;
      const previous = prevArmCommandsRef.current;
      let sentAny = false;

      ARM_JOINT_KEYS.forEach((joint) => {
        if (current[joint] !== previous[joint]) {
          robotsocket.emit("armJointCommand", {
            joint,
            value: current[joint],
          });
          sentAny = true;
        }
      });

      if (sentAny) {
        pulseTx();
      }

      prevArmCommandsRef.current = { ...current };
    }, FrameRateConstant);

    return () => clearInterval(intervalId);
  }, [serverConnected, txon]);

  useEffect(() => {
    const handleArmFeedback = (data) => {
      const joint = data?.joint;
      const approx = data?.approx;

      if (!joint) return;

      setArmFeedback((prev) => ({
        ...prev,
        [joint]: approx,
      }));
    };

    robotsocket.on("armFeedback", handleArmFeedback);

    return () => {
      robotsocket.off("armFeedback", handleArmFeedback);
    };
  }, []);

  const pulseJoint = (key) => {
    if (pulseTimeoutsRef.current[key]) {
      clearTimeout(pulseTimeoutsRef.current[key]);
    }

    setRecentlyChanged((prev) => ({
      ...prev,
      [key]: true,
    }));

    pulseTimeoutsRef.current[key] = setTimeout(() => {
      setRecentlyChanged((prev) => ({
        ...prev,
        [key]: false,
      }));
      pulseTimeoutsRef.current[key] = null;
    }, 500);
  };

  const pulseTx = () => {
    if (txPulseTimeoutRef.current) {
      clearTimeout(txPulseTimeoutRef.current);
    }

    setTxPulse(true);

    txPulseTimeoutRef.current = setTimeout(() => {
      setTxPulse(false);
      txPulseTimeoutRef.current = null;
    }, 180);
  };

  useEffect(() => {
    const pulseTimeouts = pulseTimeoutsRef.current;
    const txPulseTimeout = txPulseTimeoutRef;

    return () => {
      Object.values(pulseTimeouts).forEach((timeoutId) => {
        if (timeoutId) clearTimeout(timeoutId);
      });

      if (txPulseTimeout.current) {
        clearTimeout(txPulseTimeout.current);
      }
    };
  }, []);

  // Manual TX sends the full arm state in one payload
  const handleManualUpdate = () => {
    if (!serverConnected) return;
    robotsocket.emit("armCommands", armCommands);
    pulseTx();
    // console.log("Manual arm commands sent:", JSON.stringify(armCommands));
  };

  // When sliders are used, update armCommands state
  const handleSliderChange = (key, value) => {
    setArmCommands((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  // Highlight joints whose displayed values changed recently
  useEffect(() => {
    ARM_JOINT_KEYS.forEach((key) => {
      if (armCommands[key] !== prevDisplayCommandsRef.current[key]) {
        pulseJoint(key);
      }
    });

    prevDisplayCommandsRef.current = armCommands;
  }, [armCommands]);
  
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        flexDirection: "column",
        overflowY: "auto",
        width: "100%",
        height: "100%",
        px: 2,
        boxSizing: "border-box",
      }}
    >
      {/* If arm controller is not connected, use sliders -- else use controllers */}
      <Box
        sx={{
          mt: 4,
          width: "100%",
          maxWidth: 760,
          mx: "auto",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: "center",
            mb: 2,
            fontWeight: 500,
          }}
        >
          Arm · {controlModeLabel} · {sendModeLabel}
        </Typography>
            
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 2,
            width: "100%",
          }}
        >
          {ARM_JOINT_CONFIG.map(({ label, key, min = 0, max }) => (
            <Box
              key={label}
              sx={{
                border: recentlyChanged[key] ? "2px solid" : "1px solid #ccc",
                borderColor: recentlyChanged[key] ? "primary.main" : "#ccc",
                backgroundColor: recentlyChanged[key]
                  ? gamepadMode
                    ? "rgba(25, 118, 210, 0.05)"
                    : "rgba(25, 118, 210, 0.08)"
                  : "background.paper",
                borderRadius: 2,
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                overflow: "hidden",
                transition:
                  "background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
                boxShadow: recentlyChanged[key]
                  ? gamepadMode
                    ? "0 0 0 1px rgba(25, 118, 210, 0.10)"
                    : "0 0 0 2px rgba(25, 118, 210, 0.12)"
                  : "none",
              }}
            >
              <Typography gutterBottom>{label}</Typography>

              {!gamepadMode ? (
                <Slider
                  value={armCommands[key] ?? min}
                  onChange={(_, v) => handleSliderChange(key, v)}
                  min={min}
                  max={max}
                  step={1}
                  sx={{ width: "100%" }}
                  valueLabelDisplay="auto"
                />
              ) : (
                <Box sx={{ width: "100%", py: 1 }}>
                  <Slider
                    value={armCommands[key] ?? 0}
                    min={min}
                    max={max}
                    step={1}
                    disabled
                    sx={{ width: "100%" }}
                  />
                </Box>
              )}
                  
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Cmd:{" "}
                {Math.round(
                  ((armCommands[key] ?? 0) + Number.EPSILON) * 100,
                ) / 100}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Fb:{" "}
                {armFeedback[key] == null
                  ? "--"
                  : Math.round((armFeedback[key] + Number.EPSILON) * 100) /
                    100}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 3,
            flexWrap: "wrap",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={txon}
                onChange={(e) => settxon(e.target.checked)}
                disabled={gamepadMode}
              />
            }
            label="AUTO TX"
          />

          {!txon && !gamepadMode && (
            <Button
              variant="contained"
              onClick={handleManualUpdate}
              disabled={!serverConnected}
            >
              MANUAL TX
            </Button>
          )}
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: txPulse ? "success.main" : "grey.400",
              transition: "background-color 0.15s ease",
            }}
          />
          <Typography variant="body2" color="text.secondary">
            TX Activity
          </Typography>
        </Box>
      </Box>
  </Box>
  );
}
