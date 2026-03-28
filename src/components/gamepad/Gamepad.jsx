import { useState, useEffect, useRef } from "react";
import { Button } from "@mui/material";
import GamepadDiv from "./GamepadManager";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { green } from "@mui/material/colors";
import { red } from "@mui/material/colors";

import { useArmCommands } from "../../contexts/ArmCommandContext";
import { useDriveCommands } from "../../contexts/DriveCommandContext";
import { useConnectedGamepads } from "../../contexts/GamepadContext";
import { useMastCommands } from "../../contexts/MastCommandContext";

// Handles gamepad connections and state
export default function GamepadPanel({ currentView }) {
  // general vars
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState("Drive");
  const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();

  // drive
  const [driveCommands, setDriveCommands] = useDriveCommands();
  const driveConnectedOne = connectedGamepads.drive;
  const driveAnimationIdRef = useRef(null);

  // pan-tilt
  const [mastCommands, setMastCommands] = useMastCommands(); // includes pan angles and speed
  const panAnimationIdRef = useRef(null);
  const panAnglesRef = useRef({ px: 0, py: 0 });

  // arm
  const [armCommands, setArmCommands] = useArmCommands();
  const armConnectedOne = connectedGamepads.arm;
  const armAnimationIdRef = useRef(null);

  const gpList =
    page === "Drive"
      ? Object.values(connectedGamepads?.driveGPList || {})
      : Object.values(connectedGamepads?.armGPList || {});

  // setters that update only the selected index in the shared context
  const setDriveConnectedOne = (index) =>
    setConnectedGamepads((prev) => ({ ...prev, drive: index }));
  const setArmConnectedOne = (index) =>
    setConnectedGamepads((prev) => ({ ...prev, arm: index }));

  // Handle gamepad connections and disconnections
  useEffect(() => {
    const handleConnect = (e) => {
      const gp = e.gamepad;
      if (/STANDARD/i.test(gp.id)) {
        setConnectedGamepads((prev) => ({
          ...prev,
          driveGPList: { ...prev.driveGPList, [gp.index]: gp },
        }));
      } else if (/EXTREME/i.test(gp.id)) {
        setConnectedGamepads((prev) => ({
          ...prev,
          armGPList: { ...prev.armGPList, [gp.index]: gp },
        }));
      }
    };

    // ?. optional chaining: if undefined, yields undefined instead of throwing
    // _ : binds to gpIndex as a throw-away variable
    // rest: collects the remaining properties into a new object
    // Clear selected controller if the unplugged gamepad was active
    // Prevents stale drive/arm indices after disconnect
    // Clear selected controller if the unplugged gamepad was active
    // Prevents stale drive/arm indices after disconnect
    const handleDisconnect = (e) => {
      const gpIndex = e.gamepad.index;


      setConnectedGamepads((prev) => {
        if (prev.driveGPList?.[gpIndex]) {
          const { [gpIndex]: _, ...rest } = prev.driveGPList;
          return { 
            ...prev, 
            driveGPList: rest,
            drive: prev.drive === gpIndex ? null : prev.drive,
          };
        } 
        
        if (prev.armGPList?.[gpIndex]) {
          return { 
            ...prev, 
            driveGPList: rest,
            drive: prev.drive === gpIndex ? null : prev.drive,
          };
        } 
        
        if (prev.armGPList?.[gpIndex]) {
          const { [gpIndex]: _, ...rest } = prev.armGPList;
          return { 
            ...prev, 
            armGPList: rest,
            arm: prev.arm === gpIndex ? null : prev.arm,
          };
          return { 
            ...prev, 
            armGPList: rest,
            arm: prev.arm === gpIndex ? null : prev.arm,
          };
        }


        return prev;
      });
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, [setConnectedGamepads]);

  useEffect(() => {
    const deadZone = (v, threshold = 0.15) =>
      Math.abs(v) <= threshold ? 0 : v;

    const pollAxes = () => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      if (!gp) return;

      const next = {
        sidewaysVelocity: deadZone(Math.round(4 * gp.axes[0] * 100) / 100) || 0,
        forwardsVelocity:
          deadZone(-Math.round(4 * gp.axes[1] * 100) / 100) || 0,
        rotationalVelocity:
          deadZone(Math.round(4 * gp.axes[2] * 100) / 100) || 0,
      };

      setDriveCommands((prev) => {
        const changed =
          prev.sidewaysVelocity !== next.sidewaysVelocity ||
          prev.forwardsVelocity !== next.forwardsVelocity ||
          prev.rotationalVelocity !== next.rotationalVelocity;

        if (!changed) return prev;

        // preserve moduleConflicts (and anything else you may add later)
        return { ...prev, ...next };
      });
    };

    if (driveConnectedOne != null) {
      const loop = () => {
        pollAxes();
        driveAnimationIdRef.current = requestAnimationFrame(loop);
      };
      driveAnimationIdRef.current = requestAnimationFrame(loop);
    } else {
      // no drive pad selected -> zero the velocities, preserve moduleConflicts
      setDriveCommands((prev) => ({
        ...prev,
        sidewaysVelocity: 0,
        forwardsVelocity: 0,
        rotationalVelocity: 0,
      }));
    }

    return () => {
      if (driveAnimationIdRef.current) {
        cancelAnimationFrame(driveAnimationIdRef.current);
        driveAnimationIdRef.current = null;
      }
    };
  }, [driveConnectedOne, setDriveCommands]);

  const lastTimeRef = useRef(null);
  useEffect(() => {
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const pollAxes = (time) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }

      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const gp = navigator.getGamepads()[driveConnectedOne];
      if (gp?.buttons) {
        const newVel = {
          px: gp.buttons[15]?.pressed ? 1 : gp.buttons[14]?.pressed ? -1 : 0,
          py: gp.buttons[12]?.pressed ? 1 : gp.buttons[13]?.pressed ? -1 : 0,
        };

        // integrate in ref (real-time domain)
        const speed = mastCommands.panSpeed ?? 0;
        panAnglesRef.current.px += newVel.px * deltaTime * speed;
        panAnglesRef.current.py += newVel.py * deltaTime * speed;

        panAnglesRef.current.px = clamp(panAnglesRef.current.px, -90, 90);
        panAnglesRef.current.py = clamp(panAnglesRef.current.py, -90, 90);

        // publish to context (UI domain)
        const px = Math.round(panAnglesRef.current.px);
        const py = Math.round(panAnglesRef.current.py);
        setMastCommands((prev) => {
          if (!prev) return { px, py, panSpeed: speed };
          if (prev.px === px && prev.py === py) return prev;
          return { ...prev, px, py };
        });
      }

      panAnimationIdRef.current = requestAnimationFrame(pollAxes);
    };

    panAnimationIdRef.current = requestAnimationFrame(pollAxes);

    return () => {
      cancelAnimationFrame(panAnimationIdRef.current);
      panAnimationIdRef.current = null;
      lastTimeRef.current = null;
    };
  }, [driveConnectedOne, mastCommands?.panSpeed, setMastCommands]);

  // Polling for arm gamepad input
  useEffect(() => {
    const ARM_LIMITS = {
      elbow: { min: -100, max: -20, initial: -20 },
      shoulder: { min: -20, max: 65, initial: 0 },
      track: { min: 0, max: 300, initial: 0 },
      pitch: { min: 0, max: 180, initial: 0 },
      roll: { min: 0, max: 360, initial: 0 },
      clamp: { min: 0, max: 20, initial: 0 },
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const clean = (v, deadzone = 0.15) => {
      if (Math.abs(v) < deadzone) return 0;
      return Math.round(v * 100) / 100;
    };

    const differsEnough = (a, b, epsilon = 0.1) => Math.abs(a - b) > epsilon;

    if (armConnectedOne == null) {
      return;
    }

    let prevVal = {
      elbow: 
        typeof armCommands?.elbow === "number"
          ? armCommands.elbow
          : ARM_LIMITS.elbow.initial,
      shoulder: 
        typeof armCommands?.shoulder === "number"
          ? armCommands.shoulder
          : ARM_LIMITS.shoulder.initial,
      track: 
        typeof armCommands?.track === "number"
          ? armCommands.track
          : ARM_LIMITS.track.initial,
      pitch: 
        typeof armCommands?.pitch === "number"
          ? armCommands.pitch
          : ARM_LIMITS.pitch.initial,
      roll: 
        typeof armCommands?.roll === "number"
          ? armCommands.roll
          : ARM_LIMITS.roll.initial,
      clamp: 
        typeof armCommands?.clamp === "number"
          ? armCommands.clamp
          : ARM_LIMITS.clamp.initial,
    };

    const pollAxes = () => {
      const gp = navigator.getGamepads()[armConnectedOne];

      // Gamepad disappeared (e.g., unplugged) -> reset to safe zero state
      // so stale arm commands do not persist after disconnect
      if (!gp) {
        armAnimationIdRef.current = requestAnimationFrame(pollAxes);
        return;
      }

      // Gamepad disappeared (e.g., unplugged) -> reset to safe zero state
      // so stale arm commands do not persist after disconnect
      if (!gp) {
        armAnimationIdRef.current = requestAnimationFrame(pollAxes);
        return;
      }

      const armInputs = {
        elbow: gp.buttons[2].pressed ? clean(gp.axes[1]) : 0, 
        shoulder: gp.buttons[3].pressed ? -1 *clean(gp.axes[1]) : 0, 
        track: !gp.buttons[2].pressed && !gp.buttons[3].pressed ? clean(gp.axes[0]) : 0, 
        // treat full up/down as hard limits for better control at extremes
        pitch: 
          gp.axes[9] === -1 
            ? -1 
            : gp.axes[9] < 0.15 && gp.axes[9] > 0.14 
              ? 1 
              : 0, 
        roll: 
          gp.axes[9] < 0.72 && gp.axes[9] > 0.71 
            ? -1 
            : gp.axes[9] < -0.42 && gp.axes[9] > -0.43 
              ? 1 
              : 0,
        clamp: clean(gp.axes[3]),
        uniSens: -0.5 * (gp.axes[6]) + 0.5, // range [0, 1], inverted so up is more sensitive
      };
      console.log("Arm Inputs: ", armInputs);

      const inputSens = {
        elbow: 0.5 * armInputs.uniSens,
        shoulder: 0.5 * armInputs.uniSens,
        track: 5 * armInputs.uniSens,
        pitch: 0.75 * armInputs.uniSens,
        roll: 0.75 * armInputs.uniSens,
        clamp: 0.5 * armInputs.uniSens,
      };
      //console.log("Sens: ", inputSens);

      const nextVal = {
        elbow: clamp(
          prevVal.elbow + armInputs.elbow * inputSens.elbow,
          ARM_LIMITS.elbow.min,
          ARM_LIMITS.elbow.max,
        ),
        shoulder: clamp(
          prevVal.shoulder + armInputs.shoulder * inputSens.shoulder,
          ARM_LIMITS.shoulder.min,
          ARM_LIMITS.shoulder.max,
        ),
        track: clamp(
          prevVal.track + armInputs.track * inputSens.track,
          ARM_LIMITS.track.min,
          ARM_LIMITS.track.max,
        ),
        pitch: clamp(
          prevVal.pitch + armInputs.pitch * inputSens.pitch,
          ARM_LIMITS.pitch.min,
          ARM_LIMITS.pitch.max,
        ),
        roll: clamp(
          prevVal.roll + armInputs.roll * inputSens.roll,
          ARM_LIMITS.roll.min,
          ARM_LIMITS.roll.max,
        ),
        clamp: clamp(
          prevVal.clamp + armInputs.clamp * inputSens.clamp,
          ARM_LIMITS.clamp.min,
          ARM_LIMITS.clamp.max,
        ),
      };
      //console.log("Arm Commands: ", nextVal);

      const changed = Object.keys(nextVal).some((key) =>
        differsEnough(nextVal[key], prevVal[key], 0.1),
      );
        
      if (changed) {
        setArmCommands(nextVal);
        prevVal = nextVal;
      }

      armAnimationIdRef.current = requestAnimationFrame(pollAxes);
    };

    armAnimationIdRef.current = requestAnimationFrame(pollAxes);


    return () => {
      if (armAnimationIdRef.current) {
        cancelAnimationFrame(armAnimationIdRef.current);
        armAnimationIdRef.current = null;
      }
      if (armAnimationIdRef.current) {
        cancelAnimationFrame(armAnimationIdRef.current);
        armAnimationIdRef.current = null;
      }
    };
  }, [armConnectedOne, setArmCommands]);

  // Update connection status icon based on current view and gamepad connections
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (currentView === "DriveView") {
      setInfo(
        driveConnectedOne !== null ? (
          <SportsEsportsIcon sx={{ color: green[500], fontSize: 40 }} />
        ) : (
          <SportsEsportsIcon sx={{ color: red[500], fontSize: 40 }} />
        ),
      );
    } else if (currentView === "ArmView") {
      setInfo(
        armConnectedOne !== null ? (
          <SportsEsportsIcon sx={{ color: green[500], fontSize: 40 }} />
        ) : (
          <SportsEsportsIcon sx={{ color: red[500], fontSize: 40 }} />
        ),
      );
    } else {
      setInfo(""); // empty string if neither view
    }
  }, [currentView, driveConnectedOne, connectedGamepads.arm]);

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        display: "flex",
        justifyContent: "center",
        textAlign: "center",
        cursor: "pointer",
        position: "relative",
        marginRight: 20,
      }}
    >
      <span
        style={{
          whiteSpace: "pre-wrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        GAMEPADS{info}
      </span>

      {open == true && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            border: "1px solid gray",
            padding: "10px",
            width: "300px",
            borderRadius: "4px",
          }}
        >
          <Button
            size="small"
            sx={{
              textDecoration: page === "Drive" ? "underline" : "none",
              color: page === "Drive" ? "black" : "gray",
              "&:hover": {
                textDecoration: page === "Drive" ? "underline" : "none",
              },
            }}
            onClick={() => setPage("Drive")}
          >
            Drive
          </Button>
          <Button
            size="small"
            sx={{
              textDecoration: page === "Arm" ? "underline" : "none",
              color: page === "Arm" ? "black" : "gray",
              "&:hover": {
                textDecoration: page === "Arm" ? "underline" : "none",
              },
            }}
            onClick={() => setPage("Arm")}
          >
            Arm
          </Button>
          <GamepadDiv name={page} />
        </div>
      )}
    </div>
  );
}
