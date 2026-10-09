import { useState, useEffect, useRef } from "react";
import { Button } from "@mui/material";
import GamepadDiv from "./GamepadManager";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { green, red } from "@mui/material/colors";
import { useLocation } from "react-router-dom";

import { useArmCommands } from "../../contexts/ArmCommandContext";
import { useDriveCommands } from "../../contexts/DriveCommandContext";
import { useConnectedGamepads } from "../../contexts/GamepadContext";
import { useMastCommands } from "../../contexts/MastCommandContext";

import { ARM_LIMITS, ARM_DEFAULTS } from "../../constants/armConfig";

import { getOS } from "./getOS";
import { GamepadDisplayInterval } from "./FrameRateConstant";

// Handles gamepad connections and state
export default function GamepadPanel() {
  // general vars
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const [page, setPage] = useState(location.pathname);

  useEffect(() => {
    setPage(location.pathname);
  }, [location.pathname]);
  const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();

  const osRef = useRef(getOS());

  // drive
  const {
    driveCommands,
    setDriveCommands,
    driveCommandsRef,
    publishDriveSnapshot,
  } = useDriveCommands();
  const { driveSpeed } = driveCommands;
  const driveConnectedOne = connectedGamepads.drive;
  const driveAnimationIdRef = useRef(null);

  // pan-tilt
  const { mastCommands, mastCommandsRef, publishMastSnapshot, panAnglesRef } =
    useMastCommands();
  const panAnimationIdRef = useRef(null);

  // arm
  const { armCommandsRef, publishArmSnapshot } = useArmCommands();
  const armConnectedOne = connectedGamepads.arm;
  const armAnimationIdRef = useRef(null);

  // Handle gamepad connections and disconnections
  useEffect(() => {
    const handleConnect = (e) => {
      const gp = e.gamepad;
      const id = gp.id || "";
      if (gp.mapping === "standard" || /STANDARD/i.test(gp.id)) {
        console.log("Added standard gamepad:", id, gp.mapping);
        setConnectedGamepads((prev) => ({
          ...prev,
          driveGPList: { ...prev.driveGPList, [gp.index]: gp },
        }));
      } else if (/EXTREME/i.test(gp.id)) {
        console.log("Added arm gamepad:", id, gp.mapping);
        setConnectedGamepads((prev) => ({
          ...prev,
          armGPList: { ...prev.armGPList, [gp.index]: gp },
        }));
      } else {
        console.warn("Unrecognized gamepad, not categorized:", id, gp.mapping);
      }
    };

    // ?. optional chaining: if undefined, yields undefined instead of throwing
    // _ : binds to gpIndex as a throw-away variable
    // rest: collects the remaining properties into a new object
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
          const { [gpIndex]: _, ...rest } = prev.armGPList;
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
    let lastPublishMs = -Infinity;
    let lastPublished = driveCommandsRef.current;

    const pollAxes = (timeMs) => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      const next = {
        sidewaysVelocity:
          deadZone(Math.round(driveSpeed * (gp?.axes[0] ?? 0) * 100) / 100) || 0,
        forwardsVelocity:
          deadZone(-Math.round(driveSpeed * (gp?.axes[1] ?? 0) * 100) / 100) || 0,
        rotationalVelocity:
          deadZone(Math.round(driveSpeed * (gp?.axes[2] ?? 0) * 100) / 100) || 0,
      };

      // TX sees every sample, including neutral, without waiting for a render.
      driveCommandsRef.current = { ...driveCommandsRef.current, ...next };
      const changed =
        lastPublished.sidewaysVelocity !== next.sidewaysVelocity ||
        lastPublished.forwardsVelocity !== next.forwardsVelocity ||
        lastPublished.rotationalVelocity !== next.rotationalVelocity;
      const stopped = Object.values(next).every((value) => value === 0);

      if (changed && (stopped || timeMs - lastPublishMs >= GamepadDisplayInterval)) {
        publishDriveSnapshot();
        lastPublished = driveCommandsRef.current;
        lastPublishMs = timeMs;
      }
    };

    if (driveConnectedOne != null) {
      const loop = (timeMs) => {
        pollAxes(timeMs);
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
  }, [
    driveSpeed, driveConnectedOne, setDriveCommands,
    driveCommandsRef, publishDriveSnapshot,
  ]);

  const lastTimeRef = useRef(null);
  useEffect(() => {
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    let lastPublishMs = -Infinity;
    let lastPublished = mastCommandsRef.current;

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
          wheelsx: gp.buttons[5]?.pressed ? 1 : gp.buttons[4]?.pressed ? -1 : 0,
        };

        // integrate in ref (real-time domain)
        const speed = mastCommands.panSpeed ?? 0;
        //console.log(panAnglesRef);
        panAnglesRef.current.px += newVel.px * deltaTime * speed;
        panAnglesRef.current.py += newVel.py * deltaTime * speed;
        panAnglesRef.current.wheelsx += newVel.wheelsx * deltaTime * speed;

        panAnglesRef.current.px = clamp(panAnglesRef.current.px, -90, 90);
        panAnglesRef.current.py = clamp(panAnglesRef.current.py, -90, 90);
        panAnglesRef.current.wheelsx = clamp(
          panAnglesRef.current.wheelsx,
          -90,
          90,
        );

        // The CAN payload uses integer angles; update it at the sampling rate.
        const px = Math.round(panAnglesRef.current.px);
        const py = Math.round(panAnglesRef.current.py);
        const wheels_x = Math.round(panAnglesRef.current.wheelsx);
        mastCommandsRef.current = { ...mastCommandsRef.current, px, py, wheels_x };
        const changed =
          lastPublished.px !== px || lastPublished.py !== py ||
          lastPublished.wheels_x !== wheels_x;
        const stopped = Object.values(newVel).every((value) => value === 0);

        if (changed && (stopped || time - lastPublishMs >= GamepadDisplayInterval)) {
          publishMastSnapshot();
          lastPublished = mastCommandsRef.current;
          lastPublishMs = time;
        }
      }

      panAnimationIdRef.current = requestAnimationFrame(pollAxes);
    };

    panAnimationIdRef.current = requestAnimationFrame(pollAxes);

    return () => {
      cancelAnimationFrame(panAnimationIdRef.current);
      panAnimationIdRef.current = null;
      lastTimeRef.current = null;
    };
  }, [
    driveConnectedOne, mastCommands?.panSpeed, mastCommandsRef,
    publishMastSnapshot, panAnglesRef,
  ]);

  // Polling for arm gamepad input
  useEffect(() => {
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    // Normalize motion so it behaves consistently across frame rates.
    // We treat the old per-frame integration (at ~60fps) as the baseline.
    const framesFromRafTime = (prevTimeMs, timeMs) => {
      if (prevTimeMs == null || timeMs == null) return 1;
      const deltaMs = timeMs - prevTimeMs;
      // Convert ms -> "60fps frames" and clamp to avoid huge jumps
      // (e.g., if the tab was backgrounded).
      return clamp(deltaMs / (1000 / 60), 0, 3);
    };

    const clean = (v, deadzone = 0.15) => {
      if (Math.abs(v) < deadzone) return 0;
      return Math.round(v * 100) / 100;
    };

    const differsEnough = (a, b, epsilon = 0.1) => Math.abs(a - b) > epsilon;

    if (armConnectedOne == null) {
      return;
    }

    const currentArm = armCommandsRef.current;

    let prevVal = {
      elbow:
        typeof currentArm?.elbow === "number"
          ? currentArm.elbow
          : ARM_LIMITS.elbow.initial,
      shoulder:
        typeof currentArm?.shoulder === "number"
          ? currentArm.shoulder
          : ARM_LIMITS.shoulder.initial,
      track:
        typeof currentArm?.track === "number"
          ? currentArm.track
          : ARM_LIMITS.track.initial,
      pitch:
        typeof currentArm?.pitch === "number"
          ? currentArm.pitch
          : ARM_LIMITS.pitch.initial,
      roll:
        typeof currentArm?.roll === "number"
          ? currentArm.roll
          : ARM_LIMITS.roll.initial,
      clamp:
        typeof currentArm?.clamp === "number"
          ? currentArm.clamp
          : ARM_LIMITS.clamp.initial,
    };

    let lastTimeMs = null;
    let lastPublishMs = 0;
    let lastPublishedVal = { ...prevVal };

    const pollAxes = (timeMs) => {
      const gp = navigator.getGamepads()[armConnectedOne];

      // Preserve the final sampled position when the gamepad disappears.
      if (!gp) {
        publishArmSnapshot();
        setConnectedGamepads((prev) => ({
          ...prev,
          arm: null,
        }));

        if (armAnimationIdRef.current) {
          cancelAnimationFrame(armAnimationIdRef.current);
          armAnimationIdRef.current = null;
        }

        return;
      }

      const os = osRef.current;
      const armInputs = {
        elbow: gp.buttons[2]?.pressed ? clean(gp.axes[1]) : 0,
        shoulder: gp.buttons[3]?.pressed ? -clean(gp.axes[1]) : 0,
        track:
          !gp.buttons[0]?.pressed &&
          !gp.buttons[2]?.pressed &&
          !gp.buttons[3]?.pressed
            ? clean(gp.axes[0])
            : 0,
        ...(os === "linux"
          ? {
              pitch: -clean(gp.axes[5]),
              roll: clean(gp.axes[4]),
              clamp: gp.buttons[0]?.pressed ? -clean(gp.axes[1]) : 0,
              uniSens: -0.5 * gp.axes[3] + 0.5,
            }
          : {
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
              clamp: gp.buttons[0]?.pressed ? -clean(gp.axes[1]) : 0,
              uniSens: -0.5 * gp.axes[6] + 0.5,
            }),
      };

      const inputSens = {
        elbow: 0.5 * armInputs.uniSens,
        shoulder: 0.5 * armInputs.uniSens,
        track: 5 * armInputs.uniSens,
        pitch: 0.75 * armInputs.uniSens,
        roll: 0.75 * armInputs.uniSens,
        clamp: 0.5 * armInputs.uniSens,
      };
      //console.log("Sens: ", inputSens);

      const frameScale = framesFromRafTime(lastTimeMs, timeMs);
      lastTimeMs = timeMs;

      const nextVal = {
        elbow: clamp(
          prevVal.elbow + armInputs.elbow * inputSens.elbow * frameScale,
          ARM_LIMITS.elbow.min,
          ARM_LIMITS.elbow.max,
        ),
        shoulder: clamp(
          prevVal.shoulder +
            armInputs.shoulder * inputSens.shoulder * frameScale,
          ARM_LIMITS.shoulder.min,
          ARM_LIMITS.shoulder.max,
        ),
        track: clamp(
          prevVal.track + armInputs.track * inputSens.track * frameScale,
          ARM_LIMITS.track.min,
          ARM_LIMITS.track.max,
        ),
        pitch: clamp(
          prevVal.pitch + armInputs.pitch * inputSens.pitch * frameScale,
          ARM_LIMITS.pitch.min,
          ARM_LIMITS.pitch.max,
        ),
        roll: clamp(
          prevVal.roll + armInputs.roll * inputSens.roll * frameScale,
          ARM_LIMITS.roll.min,
          ARM_LIMITS.roll.max,
        ),
        clamp: clamp(
          prevVal.clamp + armInputs.clamp * inputSens.clamp * frameScale,
          ARM_LIMITS.clamp.min,
          ARM_LIMITS.clamp.max,
        ),
      };
      //console.log("Arm Commands: ", nextVal);

      // Advance live targets every frame; UI snapshots must not overwrite them.
      prevVal = nextVal;
      armCommandsRef.current = nextVal;

      const inputsActive =
        Math.abs(armInputs.elbow) > 0 ||
        Math.abs(armInputs.shoulder) > 0 ||
        Math.abs(armInputs.track) > 0 ||
        Math.abs(armInputs.pitch) > 0 ||
        Math.abs(armInputs.roll) > 0 ||
        Math.abs(armInputs.clamp) > 0;

      const publishDue = timeMs - lastPublishMs >= GamepadDisplayInterval;

      // Publish regularly while inputs are active (throttled), and also publish
      // once when inputs stop to flush the final value to the UI.
      if (inputsActive) {
        if (publishDue) {
          publishArmSnapshot();
          lastPublishedVal = nextVal;
          lastPublishMs = timeMs;
        }
      } else {
        const differsFromLastPublish = Object.keys(nextVal).some((key) =>
          differsEnough(nextVal[key], lastPublishedVal[key], 0.01),
        );

        if (differsFromLastPublish) {
          publishArmSnapshot();
          lastPublishedVal = nextVal;
          lastPublishMs = timeMs;
        }
      }

      armAnimationIdRef.current = requestAnimationFrame(pollAxes);
    };

    armAnimationIdRef.current = requestAnimationFrame(pollAxes);

    return () => {
      if (armAnimationIdRef.current) {
        cancelAnimationFrame(armAnimationIdRef.current);
        armAnimationIdRef.current = null;
      }
    };
  }, [armConnectedOne, armCommandsRef, publishArmSnapshot, setConnectedGamepads]);

  // Update connection status icon based on current view and gamepad connections
  const [info, setInfo] = useState("");
  useEffect(() => {
    if (location.pathname === "/drive") {
      setInfo(
        driveConnectedOne !== null ? (
          <SportsEsportsIcon sx={{ color: green[500], fontSize: 40 }} />
        ) : (
          <SportsEsportsIcon sx={{ color: red[500], fontSize: 40 }} />
        ),
      );
    } else if (location.pathname === "/arm") {
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
  }, [location.pathname, driveConnectedOne, armConnectedOne]);

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

      {open === true && (
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
            borderRadius: "12px",
          }}
        >
          <Button
            size="small"
            sx={{
              textDecoration: page === "/drive" ? "underline" : "none",
              color: page === "/drive" ? "black" : "gray",
              "&:hover": {
                textDecoration: page === "/drive" ? "underline" : "none",
              },
            }}
            onClick={() => setPage("/drive")}
          >
            Drive
          </Button>
          <Button
            size="small"
            sx={{
              textDecoration: page === "/arm" ? "underline" : "none",
              color: page === "/arm" ? "black" : "gray",
              "&:hover": {
                textDecoration: page === "/arm" ? "underline" : "none",
              },
            }}
            onClick={() => setPage("/arm")}
          >
            Arm
          </Button>
          <GamepadDiv name={page} />
        </div>
      )}
    </div>
  );
}
