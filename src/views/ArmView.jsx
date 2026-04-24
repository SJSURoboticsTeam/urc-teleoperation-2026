import { useState, useRef, useEffect, useMemo } from "react";
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
  { label: "Elbow (deg)", key: "elbow", min: -100, max: -20, initial: -20 },
  { label: "Shoulder (deg)", key: "shoulder", min: -20, max: 65, initial: 0 },
  { label: "Track (mm)", key: "track", min: 0, max: 300, initial: 0 },
  { label: "Pitch (deg)", key: "pitch", min: 0, max: 180, initial: 0 },
  { label: "Roll (deg)", key: "roll", min: 0, max: 360, initial: 0 },
  { label: "Clamp", key: "clamp", min: 0, max: 20, initial: 0 },
];

const ARM_JOINT_META = Object.fromEntries(
  ARM_JOINT_CONFIG.map((joint) => [joint.key, joint]),
);

const ARM_DEFAULTS = Object.fromEntries(
  ARM_JOINT_CONFIG.map((joint) => [joint.key, joint.initial]),
);

const ARM_CHANGE_EPSILON = {
  track: 0.5,
  shoulder: 0.5,
  elbow: 0.5,
  pitch: 0.5,
  roll: 0.5,
  clamp: 0.25,
};

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function valuesDiffer(a, b, epsilon = 0.01) {
  return Math.abs((a ?? 0) - (b ?? 0)) > epsilon;
}

// View for arm controls, handles both manual slider input and gamepad input (if connected)
export default function ArmView() {
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads] = useConnectedGamepads();
  const armConnectedOne = connectedGamepads.arm;
  const serverConnected = useRobotSocketStatus();

  const [txon, settxon] = useState(false);
  const [txPulse, setTxPulse] = useState(false);
  const [recentlyChanged, setRecentlyChanged] = useState({});

  const [armFeedback, setArmFeedback] = useState({
    track: null,
    shoulder: null,
    elbow: null,
    pitch: null,
    roll: null,
    clamp: null,
  });

  const armCommandsRef = useRef(armCommands);
  const prevArmCommandsRef = useRef(armCommands);
  const prevDisplayCommandsRef = useRef(armCommands);
  const pulseTimeoutsRef = useRef({});
  const txPulseTimeoutRef = useRef(null);
  const emitCounterRef = useRef({ full: 0, joint: 0, lastReset: Date.now() });

  const gamepadMode = armConnectedOne != null;
  const controlModeLabel = gamepadMode ? "Gamepad Control" : "Slider Control";
  const sendModeLabel = txon ? "Auto" : "Manual";

  const initializedDefaults = useMemo(() => ARM_DEFAULTS, []);

  useEffect(() => {
    armCommandsRef.current = armCommands;
  }, [armCommands]);

  // Initialize to config-based defaults if commands are missing or invalid.
  useEffect(() => {
    const hasMissing = ARM_JOINT_KEYS.some(
      (key) => typeof armCommands?.[key] !== "number",
    );

    if (hasMissing) {
      setArmCommands(initializedDefaults);
      prevArmCommandsRef.current = initializedDefaults;
      prevDisplayCommandsRef.current = initializedDefaults;
    }
  }, [armCommands, initializedDefaults, setArmCommands]);

  // When leaving gamepad mode, restore manual default
  useEffect(() => {
    if (armConnectedOne == null) {
      setArmCommands(initializedDefaults);
      prevArmCommandsRef.current = initializedDefaults;
      prevDisplayCommandsRef.current = initializedDefaults;
    }
  }, [armConnectedOne, initializedDefaults, setArmCommands]);

  // AUTO TX: emit only joints whose values changed meaningfully since last interval
  useEffect(() => {
    if (!serverConnected || !txon) return;

    // console.log("[ARM] Starting auto TX (changed joints only)");

    const intervalId = setInterval(() => {
      const current = armCommandsRef.current;
      const previous = prevArmCommandsRef.current;
      let sentAny = false;

      ARM_JOINT_KEYS.forEach((joint) => {
        const epsilon = ARM_CHANGE_EPSILON[joint] ?? 0.1;

        if (valuesDiffer(current[joint], previous[joint], epsilon)) {
          robotsocket.emit("armJointCommand", {
            joint,
            value: current[joint],
          });

          emitCounterRef.current.joint += 1;
          sentAny = true;
        }
      });

      const now = Date.now();
      if (now - emitCounterRef.current.lastReset >= 1000) {
        // console.log(
        //   `[ARM TX RATE] full=${emitCounterRef.current.full}/s joint=${emitCounterRef.current.joint}/s`,
        // );
        emitCounterRef.current.full = 0;
        emitCounterRef.current.joint = 0;
        emitCounterRef.current.lastReset = now;
      }

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
    emitCounterRef.current.full += 1;
    pulseTx();

    // console.log("[ARM MANUAL TX]", armCommands);
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
      if (valuesDiffer(armCommands[key], prevDisplayCommandsRef.current[key], 0.01)) {
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
        px: { xs: 1, sm: 2 },
        boxSizing: "border-box",
      }}
    >
      {/* If arm controller is not connected, use sliders -- else use controllers */}
      <Box
        sx={{
          mt: 2,
          width: "100%",
          maxWidth: 980,
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
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(auto-fit, minmax(260px, 1fr))",
            },
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
              <Typography 
                gutterBottom
                sx={{
                  textAlign: "center",
                  wordBreak: "break-word",
                }}
              >
                {label}
              </Typography>

              {!gamepadMode ? (
                <Slider
                  value={armCommands[key] ?? ARM_JOINT_META[key].initial}
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
                    value={armCommands[key] ?? ARM_JOINT_META[key].initial}
                    min={min}
                    max={max}
                    step={1}
                    disabled
                    sx={{ width: "100%" }}
                  />
                </Box>
              )}
                  
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Cmd: {round2(armCommands[key] ?? ARM_JOINT_META[key].initial)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Fb: {armFeedback[key] == null ? "--" : round2(armFeedback[key])}
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
              />
            }
            label="AUTO TX"
          />

          {!txon && (
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
