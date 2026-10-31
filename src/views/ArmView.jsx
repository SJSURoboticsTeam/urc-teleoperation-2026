import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "react-resizable/css/styles.css";
import { Typography, Box, Slider, Button } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

import { FrameRateConstant } from "../components/gamepad/FrameRateConstant";

import { robotsocket } from "../components/socket.io/socket";

// Read shared robot connection status for arm controls.
import { useConnectionStatus } from "../contexts/ConnectionContext";

import { useArmCommands } from "../contexts/ArmCommandContext";
import { useConnectedGamepads } from "../contexts/GamepadContext";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";
import { useSoftStop } from "../contexts/SoftStopContext";
import { usePeripherals } from "../contexts/PeripheralContext";

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

  const { canState } = usePeripherals();
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads] = useConnectedGamepads();

  // Use centralized connection state to control arm commands.
  const { robotConnected: serverConnected } = useConnectionStatus();

  const { autonomyEnabled } = useAutonomyMode();
  const { softStopActive } = useSoftStop();

  const armConnectedOne = connectedGamepads.arm;
  const gamepadMode = armConnectedOne != null;
  const controlsLocked = autonomyEnabled || softStopActive;

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

  const visualCommands = {
    track: safeArmCommands.track ?? ARM_JOINT_META.track.initial,
    shoulder: safeArmCommands.shoulder ?? ARM_JOINT_META.shoulder.initial,
    elbow: safeArmCommands.elbow ?? ARM_JOINT_META.elbow.initial,
    pitch: safeArmCommands.pitch ?? ARM_JOINT_META.pitch.initial,
    roll: safeArmCommands.roll ?? ARM_JOINT_META.roll.initial,
    clamp: safeArmCommands.clamp ?? ARM_JOINT_META.clamp.initial,
  };
  const trackOffset = (visualCommands.track / ARM_JOINT_META.track.max) * 30;
  const shoulderRotation =
    visualCommands.shoulder - ARM_JOINT_META.shoulder.initial;
  const elbowRotation = visualCommands.elbow - ARM_JOINT_META.elbow.initial;
  const pitchRotation = visualCommands.pitch - ARM_JOINT_META.pitch.initial;
  const rollRotation = visualCommands.roll - ARM_JOINT_META.roll.initial;
  const clampRotation =
    (visualCommands.clamp - ARM_JOINT_META.clamp.initial) * 0.25;

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

        {(canState.armState == "idle"&& !controlsLocked) && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
            }}
            color="error"
          >
            You don't have CAN connected!
          </Typography>
        )}

        {controlsLocked && (
          <Typography
            sx={{
              textAlign: "center",
              mb: 2,
              fontWeight: 700,
            }}
            color="error"
          >
            Arm controls are disabled while autonomy or Soft Stop is active.
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          width: "100%",
          mt: 4,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 250 200"
          role="img"
          aria-label="Arm pose visualization"
          style={{ width: "100%", maxWidth: 500, height: "auto" }}
        >
          <g id="body">
              <rect x="50" y="95" width="104" height="31" fill="#80cdd6" />
            </g>
          <g transform={`translate(${trackOffset} 0)`}>
            <g transform={`rotate(${shoulderRotation} 122 108)`}>
              <g id="neck" strokeLinecap="round">
                <line x1="122" y1="108" x2="148" y2="52" stroke="#4aa3ae" strokeWidth="25.5" />
                <line x1="122" y1="108" x2="148" y2="52" stroke="#80cdd6" strokeWidth="24" />
              </g>
              <g transform={`rotate(${elbowRotation} 148 52)`}>
                <g id="head" strokeLinecap="round">
                  <line x1="146" y1="46" x2="185" y2="80" stroke="#4aa3ae" strokeWidth="25.5" />
                  <line x1="146" y1="46" x2="185" y2="80" stroke="#80cdd6" strokeWidth="24" />
                </g>
                <g transform={`rotate(${pitchRotation} 185 80)`}>
                  <g
                    id="clamp1"
                    transform={`rotate(${-clampRotation} 185 90)`}
                    strokeLinecap="round"
                  >
                    <line x1="185" y1="90" x2="195" y2="110" stroke="#4aa3ae" strokeWidth="11" />
                    <line x1="185" y1="90" x2="195" y2="110" stroke="#80cdd6" strokeWidth="10" />
                    <line x1="195" y1="110" x2="201" y2="105" stroke="#4aa3ae" strokeWidth="11" />
                    <line x1="195" y1="110" x2="201" y2="105" stroke="#80cdd6" strokeWidth="10" />
                  </g>
                  <g
                    id="clamp2"
                    transform={`rotate(${clampRotation} 195 80)`}
                    strokeLinecap="round"
                  >
                    <line x1="195" y1="80" x2="215" y2="90" stroke="#4aa3ae" strokeWidth="11" />
                    <line x1="195" y1="80" x2="215" y2="90" stroke="#80cdd6" strokeWidth="10" />
                    <line x1="215" y1="90" x2="209" y2="98" stroke="#4aa3ae" strokeWidth="11" />
                    <line x1="215" y1="90" x2="209" y2="98" stroke="#80cdd6" strokeWidth="10" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 250 200"
          role="img"
          aria-label={`Front view of clamp at ${round2(visualCommands.roll)} degrees wrist roll`}
          style={{ width: "100%", maxWidth: 200, height: "auto" }}
        >
          <circle cx="125" cy="100" r="58" fill="#80cdd6" stroke="#4aa3ae" strokeWidth="2" />
          <g transform={`rotate(${rollRotation} 125 100)`} strokeLinecap="round">
            <line x1="125" y1="50" x2="125" y2="80" stroke="#4aa3ae" strokeWidth="30" />
            <line x1="125" y1="50" x2="125" y2="80" stroke="#80cdd6" strokeWidth="26" />
            <line x1="125" y1="120" x2="125" y2="150" stroke="#4aa3ae" strokeWidth="30" />
            <line x1="125" y1="120" x2="125" y2="150" stroke="#80cdd6" strokeWidth="26" />
          </g>
        </svg>
      </Box>
    </Box>
  );
}