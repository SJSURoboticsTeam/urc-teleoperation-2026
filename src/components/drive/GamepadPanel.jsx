import { useState, useEffect } from "react";
import { Button, Collapse, Paper } from "@mui/material";
import GamepadDiv from "./GamepadDiv";

export default function GamepadPanel({ driveGamepads, onDriveVelocitiesChange, armGamepads, onArmVelocitiesChange }) {
  const [driveConnectedOne, setDriveConnectedOne] = useState(null);
  const [driveVelocities, setDriveVelocities] = useState({ lx: 0, ly: 0, rx: 0 });
  const [open, setOpen] = useState(false);
  const [armConnectedOne, setArmConnectedOne] = useState(null);

  useEffect(() => {
    if (driveConnectedOne == null) {
      setDriveVelocities({ lx: 0, ly: 0, rx: 0 });
      onDriveVelocitiesChange?.({ lx: 0, ly: 0, rx: 0 });
      return;
    }
    let animationId;
    const pollAxes = () => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      if (gp) {
        const newVel = {
          lx: gp.axes[0] || 0,
          ly: -(gp.axes[1] || 0),
          rx: gp.axes[2] || 0,
        };
        setDriveVelocities(newVel);
        onDriveVelocitiesChange?.(newVel);
      }
      animationId=requestAnimationFrame(pollAxes);
    };
    pollAxes();
    return () => cancelAnimationFrame(animationId);
  }, [driveConnectedOne, onDriveVelocitiesChange]);



  console.log(driveGamepads) //dbg
  const gpList = Object.values(driveGamepads);
  console.log(gpList); //dbg

  console.log(armGamepads) //dbg
  const armList=Object.values(armGamepads);
  console.log(armList); //dbg

  return (
    <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        // needed to detect hover and placement of popup
        style={{ position: "relative", cursor: "pointer", marginRight: 5}}
      >
      <Button disableRipple sx={{maxWidth:'contain', border: 'none', boxShadow:'none', backgroundColor:'inherit', color:'inherit', "&:hover":{boxShadow:'none', backgroundColor:'inherit'}}} variant="contained">
        Gamepads {open ? "▲" : "▼"}
      </Button>
      <Collapse in={open}>
      <Paper sx={{textAlign:'center', maxHeight:150,width:400,overflowX:'hidden',overflowY:'auto',left:'50%',transform: 'translateX(-50%)',position:'absolute',top:'100%', zIndex:1300, padding: 1}}>
        <GamepadDiv gpList={gpList} connectedOne={driveConnectedOne} setConnectedOne={setDriveConnectedOne} name="Drive" />
        <GamepadDiv gpList={armList} connectedOne={armConnectedOne} setConnectedOne={setArmConnectedOne} name="Arm" />
        </Paper>
      </Collapse>
    </div>
  );
}
