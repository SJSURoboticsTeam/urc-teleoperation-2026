import { useState, useEffect } from "react";
import { Button, Collapse, Paper } from "@mui/material";
import GamepadDiv from "./GamepadManager";
import { FrameRateConstant } from "./FrameRateConstant";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { green } from "@mui/material/colors";
import { red } from "@mui/material/colors";

import { useArmCommands } from "../../contexts/ArmCommandContext";
import { useConnectedGamepads } from "../../contexts/GamepadContext";

// Handles gamepad connections and state
export default function GamepadPanel({
  onDriveVelocitiesChange,
  currentView,
  setModuleConflicts,
  onPanVelocitiesChange,
}) {
  const [driveVelocities, setDriveVelocities] = useState({
    lx: 0,
    ly: 0,
    rx: 0,
  });
  const [open, setOpen] = useState(false);
  const [panVelocities, setPanVelocities] = useState({
    px: 0,
    py: 0,
  });
  // const [armConnectedOne, setArmConnectedOne] = useState(null);
  const [page, setPage] = useState("Drive");
  const [prevTime, setPrevTime] = useState();
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();
  const driveConnectedOne = connectedGamepads.drive;
  const armConnectedOne = connectedGamepads.arm;

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

  // Polling for drive gamepad input
  useEffect(() => {
    let intervalId;
    const deadZone = (v, threshold = 0.15) =>
      Math.abs(v) <= threshold ? 0 : v;

    const pollAxes = () => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      if (gp) {
        const newVel = {
          lx: deadZone(Math.round(4 * gp.axes[0] * 100) / 100) || 0,
          ly: deadZone(-Math.round(4 * gp.axes[1] * 100) / 100) || 0,
          rx: deadZone(Math.round(4 * gp.axes[2] * 100) / 100) || 0,
        };
        setDriveVelocities((prev) => {
          if (
            prev.lx !== newVel.lx ||
            prev.ly !== newVel.ly ||
            prev.rx !== newVel.rx
          ) {
            onDriveVelocitiesChange?.(newVel);
            return newVel;
          }
          onDriveVelocitiesChange?.(prev);
          return prev; // no change = no re-render
        });
      }
    };
    if (driveConnectedOne != null) {
      intervalId = setInterval(pollAxes, FrameRateConstant);
      console.log(`Polling drive gamepad every ${FrameRateConstant}ms`);
    } else {
      const zero = { lx: 0, ly: 0, rx: 0 };
      setDriveVelocities(zero);
      onDriveVelocitiesChange?.(zero);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [driveConnectedOne, onDriveVelocitiesChange]);

  // Polling for pan input
  useEffect(() => {
    if (driveConnectedOne == null) {
      setPanVelocities({ px: 0, py: 0 });
      onPanVelocitiesChange?.({ px: 0, py: 0 });
      return;
    }
    let animationId;
    // poll for data
    const pollAxes = () => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      if (gp) {
        const newVel = {
          px: gp.buttons[15]?.pressed ? 1 : gp.buttons[14]?.pressed ? -1 : 0,
          py: gp.buttons[12]?.pressed ? 1 : gp.buttons[13]?.pressed ? -1 : 0,
        };
        // then set states
        setPanVelocities(newVel);
        onPanVelocitiesChange?.(newVel);
      }
      animationId = requestAnimationFrame(pollAxes);
    };
    pollAxes();
    return () => cancelAnimationFrame(animationId);
  }, [driveConnectedOne, onPanVelocitiesChange]);

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
        const newVal = {
          elbow: gp.axes[9],
          shoulder: gp.axes[1],
          track: gp.axes[3],
          pitch: gp.axes[0],
          roll: gp.axes[5],
          clamp: gp.axes[6],
        };

        const changed = Object.keys(newVal).some(
          (key) => newVal[key] !== prevVal[key],
        );
        if (changed) {
          setArmCommands(newVal);
          prevVal = newVal;
        }
      }
    };

    const intervalId = setInterval(pollAxes, FrameRateConstant);
    console.log(`Polling arm gamepad every ${FrameRateConstant}ms`);
    return () => clearInterval(intervalId);
  }, [armConnectedOne, setArmCommands]);

  // //console.log(driveGamepads) //dbg
  // const gpList = Object.values(driveGamepads);
  // //console.log(gpList); //dbg

  // console.log(connectedGamepads.arm); //dbg
  // const armList = Object.values(connectedGamepads.arm);
  // console.log(armList); //dbg

  const [info, setInfo] = useState("");

  // Update connection status icon based on current view and gamepad connections
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
      <Collapse in={open}>
        <Paper
          sx={{
            textAlign: "center",
            maxHeight: 225,
            width: 400,
            overflowX: "hidden",
            overflowY: "auto",
            left: "50%",
            transform: "translateX(-50%)",
            position: "absolute",
            top: "100%",
            zIndex: 1300,
            padding: 1,
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
        </Paper>
      </Collapse>
    </div>
  );
}
