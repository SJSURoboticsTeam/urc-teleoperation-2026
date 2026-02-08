import { useState, useEffect, useRef } from "react";
import { Button, Collapse, Paper } from "@mui/material";
import GamepadDiv from "./GamepadManager";
import { FrameRateConstant } from "./FrameRateConstant";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { green, red } from "@mui/material/colors";

export default function GamepadPanel({
  driveGamepads,
  onDriveVelocitiesChange,
  armGamepads,
  onArmVelocitiesChange,
  currentView,
  setModuleConflicts,
  panSpeed,
  setPanAngles,
  driveConnectedOne,
  setDriveConnectedOne,
}) {
  /* -------------------- state -------------------- */

  const [driveVelocities, setDriveVelocities] = useState({ lx: 0, ly: 0, rx: 0 });
  const [panVelocities, setPanVelocities] = useState({ px: 0, py: 0 });
  const [armVelocities, setArmVelocities] = useState({
    Elbow: 0,
    Shoulder: 0,
    Track: 0,
    Pitch: 0,
    Roll: 0,
    Effector: 0,
  });

  const [armConnectedOne, setArmConnectedOne] = useState(null);
  const [armManualDisconnect, setArmManualDisconnect] = useState(false);

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState("Drive");
  const [info, setInfo] = useState("");

  /* -------------------- refs -------------------- */

  const driveRafRef = useRef(null);
  const panRafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const panAnglesRef = useRef({ px: 0, py: 0 });

  /* -------------------- drive polling -------------------- */

  useEffect(() => {
    if (driveConnectedOne == null) {
      const zero = { lx: 0, ly: 0, rx: 0 };
      setDriveVelocities(zero);
      onDriveVelocitiesChange?.(zero);
      return;
    }

    const deadZone = (v, t = 0.15) => (Math.abs(v) <= t ? 0 : v);

    const pollAxes = () => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      if (!gp) return;

      const next = {
        lx: deadZone(Math.round(4 * gp.axes[0] * 100) / 100),
        ly: deadZone(-Math.round(4 * gp.axes[1] * 100) / 100),
        rx: deadZone(Math.round(4 * gp.axes[2] * 100) / 100),
      };

      setDriveVelocities((prev) => {
        if (
          prev.lx !== next.lx ||
          prev.ly !== next.ly ||
          prev.rx !== next.rx
        ) {
          onDriveVelocitiesChange?.(next);
          return next;
        }
        return prev;
      });

      driveRafRef.current = requestAnimationFrame(pollAxes);
    };

    driveRafRef.current = requestAnimationFrame(pollAxes);

    return () => cancelAnimationFrame(driveRafRef.current);
  }, [driveConnectedOne, onDriveVelocitiesChange]);

  /* -------------------- pan polling -------------------- */

  useEffect(() => {
    if (driveConnectedOne == null) {
      setPanVelocities({ px: 0, py: 0 });
      return;
    }

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const pollAxes = (time) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
      }

      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const gp = navigator.getGamepads()[driveConnectedOne];
      if (gp?.buttons) {
        const vel = {
          px: gp.buttons[15]?.pressed ? 1 : gp.buttons[14]?.pressed ? -1 : 0,
          py: gp.buttons[12]?.pressed ? 1 : gp.buttons[13]?.pressed ? -1 : 0,
        };

        panAnglesRef.current.px += vel.px * dt * panSpeed;
        panAnglesRef.current.py += vel.py * dt * panSpeed;

        panAnglesRef.current.px = clamp(panAnglesRef.current.px, -90, 90);
        panAnglesRef.current.py = clamp(panAnglesRef.current.py, -90, 90);

        setPanAngles({
          px: Math.round(panAnglesRef.current.px),
          py: Math.round(panAnglesRef.current.py),
        });

        setPanVelocities(vel);
      }

      panRafRef.current = requestAnimationFrame(pollAxes);
    };

    panRafRef.current = requestAnimationFrame(pollAxes);

    return () => {
      cancelAnimationFrame(panRafRef.current);
      lastTimeRef.current = null;
    };
  }, [driveConnectedOne, panSpeed, setPanAngles]);

  /* -------------------- arm polling -------------------- */

  useEffect(() => {
    if (armManualDisconnect || armConnectedOne == null) {
      const zero = {
        Elbow: 0,
        Shoulder: 0,
        Track: 0,
        Pitch: 0,
        Roll: 0,
        Effector: 0,
        armConnectedOne,
      };
      setArmVelocities(zero);
      onArmVelocitiesChange?.(zero);
      return;
    }

    const pollAxes = () => {
      const gp = navigator.getGamepads()[armConnectedOne];
      if (!gp) return;

      const next = {
        Elbow: gp.axes[9],
        Shoulder: gp.axes[1],
        Track: gp.axes[3],
        Pitch: gp.axes[0],
        Roll: gp.axes[5],
        Effector: gp.axes[6],
        armConnectedOne,
      };

      setArmVelocities((prev) => {
        const changed = Object.keys(next).some((k) => next[k] !== prev[k]);
        onArmVelocitiesChange?.(changed ? next : prev);
        return changed ? next : prev;
      });
    };

    const id = setInterval(pollAxes, FrameRateConstant);
    return () => clearInterval(id);
  }, [armConnectedOne, armManualDisconnect, onArmVelocitiesChange]);

  /* -------------------- UI status icon -------------------- */

  useEffect(() => {
    if (currentView === "DriveView") {
      setInfo(
        <SportsEsportsIcon
          sx={{
            color: driveConnectedOne != null ? green[500] : red[500],
            fontSize: 40,
          }}
        />
      );
    } else if (currentView === "ArmView") {
      setInfo(
        <SportsEsportsIcon
          sx={{
            color: armConnectedOne != null ? green[500] : red[500],
            fontSize: 40,
          }}
        />
      );
    } else {
      setInfo("");
    }
  }, [currentView, driveConnectedOne, armConnectedOne]);

  /* -------------------- render -------------------- */

  const gpList = Object.values(driveGamepads);
  const armList = Object.values(armGamepads);

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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        GAMEPADS{info}
      </span>

      <Collapse in={open}>
        <Paper
          sx={{
            maxHeight: 225,
            width: 400,
            overflowY: "auto",
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1300,
            p: 1,
          }}
        >
          <Button
            size="small"
            sx={{ textDecoration: page === "Drive" ? "underline" : "none" }}
            onClick={() => setPage("Drive")}
          >
            Drive
          </Button>
          <Button
            size="small"
            sx={{ textDecoration: page === "Arm" ? "underline" : "none" }}
            onClick={() => setPage("Arm")}
          >
            Arm
          </Button>

          {page === "Drive" ? (
            <GamepadDiv
              setModuleConflicts={setModuleConflicts}
              gpList={gpList}
              connectedOne={driveConnectedOne}
              setConnectedOne={setDriveConnectedOne}
              name="Drive"
            />
          ) : (
            <GamepadDiv
              setArmManualDisconnect={setArmManualDisconnect}
              gpList={armList}
              connectedOne={armConnectedOne}
              setConnectedOne={setArmConnectedOne}
              name="Arm"
            />
          )}
        </Paper>
      </Collapse>
    </div>
  );
}