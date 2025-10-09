import { useState, useEffect } from "react";
import { Box, Typography, Button, Collapse, Paper } from "@mui/material";
import GamepadPaper from "./GamepadPaper";

export default function GamepadPanel({ driveGamepads, onVelocitiesChange}) {
  const [connectedOne, setConnectedOne] = useState(null);
  const [velocities, setVelocities] = useState({ lx: 0, ly: 0, rx: 0 });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (connectedOne == null) {
      setVelocities({ lx: 0, ly: 0, rx: 0 });
      onVelocitiesChange?.({ lx: 0, ly: 0, rx: 0 });
      return;
    }
    let animationId;
    const pollAxes = () => {
      const gp = navigator.getGamepads()[connectedOne];
      if (gp) {
        const newVel = {
          lx: gp.axes[0] || 0,
          ly: -(gp.axes[1] || 0),
          rx: gp.axes[2] || 0,
        };
        setVelocities(newVel);
        onVelocitiesChange?.(newVel);
      }
      animationId=requestAnimationFrame(pollAxes);
    };

    pollAxes();

    return () => cancelAnimationFrame(animationId);
  }, [connectedOne, onVelocitiesChange]);
  console.log(driveGamepads)
  const gpList = Object.values(driveGamepads);
  console.log(gpList);
  return (
    <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        // needed to detect hover and placement of popup
        style={{ position: "relative", cursor: "pointer", marginRight: 20}}
      >
      <span>  GAMEPADS: {(connectedOne != null) ? "ACTIVE" : "DISCONNECTED"}</span>

      <Collapse in={open}>
        <GamepadPaper gpList={gpList} connectedOne={connectedOne} setConnectedOne={setConnectedOne} />
      </Collapse>
    </div>
  );
}
