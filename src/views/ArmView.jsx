import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "react-resizable/css/styles.css";
import { Typography, Box, Slider, Button } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

import { FrameRateConstant } from "../components/gamepad/FrameRateConstant";
import {
  useRobotSocketStatus,
  robotsocket,
} from "../components/socket.io/socket";
import { useArmCommands } from "../contexts/ArmCommandContext";
import { useConnectedGamepads } from "../contexts/GamepadContext";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";

import {
  ARM_JOINT_KEYS,
  ARM_JOINT_CONFIG,
  ARM_JOINT_META,
  ARM_DEFAULTS,
  ARM_CHANGE_EPSILON,
} from "../constants/armConfig";

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function valuesDiffer(a, b, epsilon = 0.01) {
  return Math.abs((a ?? 0) - (b ?? 0)) > epsilon;
}

// View for arm controls.
// Handles manual sliders, gamepad-driven display, feedback, TX status,
// and autonomy lockout.
export default function ArmView() {
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads] = useConnectedGamepads();
  const serverConnected = useRobotSocketStatus();

  const { autonomyEnabled } = useAutonomyMode();

  const armConnectedOne = connectedGamepads.arm;
  const gamepadMode = armConnectedOne != null;
  const controlsLocked = autonomyEnabled;

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

  const initializedDefaults = useMemo(() => ARM_DEFAULTS, []);
  const safeArmCommands = armCommands ?? initializedDefaults;

  const armCommandsRef = useRef(safeArmCommands);
  const prevArmCommandsRef = useRef(safeArmCommands);
  const prevDisplayCommandsRef = useRef(safeArmCommands);
  const pulseTimeoutsRef = useRef({});
  const txPulseTimeoutRef = useRef(null);
  const emitCounterRef = useRef({
    full: 0,
    joint: 0,
    lastReset: Date.now(),
  });

  const controlModeLabel = gamepadMode ? "Gamepad Control" : "Slider Control";
  const sendModeLabel = controlsLocked ? "Locked" : txon ? "Auto" : "Manual";

  useEffect(() => {
    armCommandsRef.current = safeArmCommands;
  }, [safeArmCommands]);

  // Initialize to config-based defaults if commands are missing or invalid.
  useEffect(() => {
    const hasMissing = ARM_JOINT_KEYS.some(
      (key) => typeof armCommands?.[key] !== "number",
    );

    if (hasMissing) {
      const nextCommands = ARM_JOINT_KEYS.reduce((acc, key) => {
        acc[key] =
          typeof armCommands?.[key] === "number"
            ? armCommands[key]
            : initializedDefaults[key];

        return acc;
      }, {});

      setArmCommands(nextCommands);
      prevArmCommandsRef.current = nextCommands;
      prevDisplayCommandsRef.current = nextCommands;
      armCommandsRef.current = nextCommands;
    }
  }, [armCommands, initializedDefaults, setArmCommands]);

  // If autonomy starts, immediately stop auto-transmission.
  useEffect(() => {
    if (controlsLocked && txon) {
      settxon(false);
    }
  }, [controlsLocked, txon]);

  // Preserve current values when leaving gamepad mode instead of resetting defaults.
  useEffect(() => {
    if (armConnectedOne == null) {
      const currentCommands = armCommandsRef.current;

      const hasAllCommands = ARM_JOINT_KEYS.every(
        (key) => typeof currentCommands?.[key] === "number",
      );

      if (hasAllCommands) {
        const snapshot = { ...currentCommands };
        prevArmCommandsRef.current = snapshot;
        prevDisplayCommandsRef.current = snapshot;
      }
    }
  }, [armConnectedOne]);

  const pulseJoint = useCallback((key) => {
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
  }, []);

  const pulseTx = useCallback(() => {
    if (txPulseTimeoutRef.current) {
      clearTimeout(txPulseTimeoutRef.current);
    }

    setTxPulse(true);

    txPulseTimeoutRef.current = setTimeout(() => {
      setTxPulse(false);
      txPulseTimeoutRef.current = null;
    }, 180);
  }, []);

  // AUTO TX:
  // Emit only joints whose values changed meaningfully since the last interval.
  // Disabled whenever autonomy is active.
  useEffect(() => {
    if (controlsLocked || !serverConnected || !txon) return;

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
          pulseJoint(joint);
          sentAny = true;
        }
      });

      const now = Date.now();

      if (now - emitCounterRef.current.lastReset >= 1000) {
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
  }, [controlsLocked, serverConnected, txon, pulseJoint, pulseTx]);

  // Listen for arm feedback from the robot.
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

  // Clear pulse timers on unmount.
  useEffect(() => {
    const pulseTimeouts = pulseTimeoutsRef.current;

    return () => {
      Object.values(pulseTimeouts).forEach((timeoutId) => {
        if (timeoutId) clearTimeout(timeoutId);
      });

      if (txPulseTimeoutRef.current) {
        clearTimeout(txPulseTimeoutRef.current);
      }
    };
  }, []);

  // Manual TX sends the full arm state in one payload.
  const handleManualUpdate = () => {
    if (controlsLocked || !serverConnected) return;

    robotsocket.emit("armCommands", safeArmCommands);

    emitCounterRef.current.full += 1;
    pulseTx();
  };

  // When sliders are used, update armCommands state.
  const handleSliderChange = (key, value) => {
    if (controlsLocked) return;

    setArmCommands((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  // Highlight joints whose displayed values changed recently.
  useEffect(() => {
    ARM_JOINT_KEYS.forEach((key) => {
      if (
        valuesDiffer(
          safeArmCommands[key],
          prevDisplayCommandsRef.current[key],
          0.01,
        )
      ) {
        pulseJoint(key);
      }
    });

    prevDisplayCommandsRef.current = { ...safeArmCommands };
  }, [safeArmCommands, pulseJoint]);

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
            mb: 1,
            fontWeight: 500,
          }}
        >
          Arm · {controlModeLabel} · {sendModeLabel}
        </Typography>

        {controlsLocked && (
          <Typography
            sx={{
              textAlign: "center",
              mb: 2,
              fontWeight: 700,
            }}
            color="error"
          >
            Arm controls are disabled while autonomy is active.
          </Typography>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(auto-fit, minmax(260px, 1fr))",
            },
            gap: 2,
            width: "100%",
            opacity: controlsLocked ? 0.55 : 1,
          }}
        >
          {ARM_JOINT_CONFIG.map(({ label, key, min, max }) => (
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
                  "background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease",
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
                  value={safeArmCommands[key] ?? ARM_JOINT_META[key].initial}
                  onChange={(_, v) => handleSliderChange(key, v)}
                  min={min}
                  max={max}
                  step={1}
                  sx={{ width: "90%" }}
                  valueLabelDisplay="auto"
                  disabled={controlsLocked}
                />
              ) : (
                <Box sx={{ width: "100%", py: 1 }}>
                  <Slider
                    value={safeArmCommands[key] ?? ARM_JOINT_META[key].initial}
                    min={min}
                    max={max}
                    step={1}
                    disabled
                    sx={{ width: "90%" }}
                  />
                </Box>
              )}

              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Cmd:{" "}
                {round2(
                  safeArmCommands[key] ?? ARM_JOINT_META[key].initial,
                ).toFixed(1)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Fb:{" "}
                {armFeedback[key] == null
                  ? "--"
                  : round2(armFeedback[key]).toFixed(1)}
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
                disabled={controlsLocked}
              />
            }
            label="AUTO TX"
          />

          {!txon && (
            <Button
              variant="contained"
              onClick={handleManualUpdate}
              disabled={controlsLocked || !serverConnected}
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