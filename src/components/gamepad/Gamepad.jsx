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
    const handleDisconnect = (e) => {
      const gpIndex = e.gamepad.index;
      setConnectedGamepads((prev) => {
        if (prev.driveGPList?.[gpIndex]) {
          const { [gpIndex]: _, ...rest } = prev.driveGPList;
          return { ...prev, driveGPList: rest };
        } else if (prev.armGPList?.[gpIndex]) {
          const { [gpIndex]: _, ...rest } = prev.armGPList;
          return { ...prev, armGPList: rest };
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
  const [armManualDisconnect, setArmManualDisconnect] = useState(false);
  useEffect(() => {
    if (armManualDisconnect || armConnectedOne == null) {
      setArmCommands({
        track: 0,
        shoulder: 0,
        elbow: 0,
        pitch: 0,
        roll: 0,
        clamp: 0,
      });
      return;
    }

    let prevVal = {
      elbow: 0,
      shoulder: 0,
      track: 0,
      pitch: 0,
      roll: 0,
      clamp: 0,
    };

    const pollAxes = () => {
      const gp = navigator.getGamepads()[armConnectedOne];
      if (gp) {
        const clean = (v, deadzone = 0.08) => {
          if (Math.abs(v) < deadzone) return 0;
          return Math.round(v * 100) / 100;
        };

        const newVal = {
          elbow: clean(gp.axes[9]),
          shoulder: clean(gp.axes[1]),
          track: clean(gp.axes[3]),
          pitch: clean(gp.axes[0]),
          roll: clean(gp.axes[5]),
          clamp: clean(gp.axes[6]),
        };

        const changed = Object.keys(newVal).some(
          (key) => newVal[key] !== prevVal[key],
        );
        if (changed) {
          setArmCommands(newVal);
          prevVal = newVal;
        }
      }

      armAnimationIdRef.current = requestAnimationFrame(pollAxes);
    };

    armAnimationIdRef.current = requestAnimationFrame(pollAxes);
    return () => {
      cancelAnimationFrame(armAnimationIdRef.current);
      armAnimationIdRef.current = null;
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
