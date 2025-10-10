import { useState, useEffect } from "react";
import { Button, Collapse, Paper } from "@mui/material";
import GamepadDiv from "./GamepadDiv";

export default function GamepadPanel({ driveGamepads, onDriveVelocitiesChange, armGamepads, onArmVelocitiesChange, currentView }) {
  const [driveConnectedOne, setDriveConnectedOne] = useState(null);
  const [driveVelocities, setDriveVelocities] = useState({ lx: 0, ly: 0, rx: 0 });
  const [open, setOpen] = useState(false);
  const [armConnectedOne, setArmConnectedOne] = useState(null);
  const [page,setPage]=useState('Drive');
  const [armVelocities, setArmVelocities]=useState({'Elbow':0,'Shoulder':0,'Track':0,'Pitch':0,'Roll':0,'Effector':0})
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


  useEffect(()=>{
    if (armConnectedOne==null) {
      setArmVelocities({'Elbow':0,'Shoulder':0,'Track':0,'Pitch':0,'Roll':0,'Effector':0})
      onArmVelocitiesChange?.({'Elbow':0,'Shoulder':0,'Track':0,'Pitch':0,'Roll':0,'Effector':0, armConnectedOne})
      return;
    }
    let animationId;
    const pollAxes=()=>{
      const gp=navigator.getGamepads()[armConnectedOne];
      if (gp) {
        const newVal= {
          'Elbow':gp.axes[9],
          'Shoulder':gp.axes[1],
          'Track':0,
          'Pitch':0,
          'Roll':gp.axes[5],
          'Effector':0,
          armConnectedOne}
        setArmVelocities(newVal);
        onArmVelocitiesChange?.({...newVal, armConnectedOne});
      }
      animationId=requestAnimationFrame(pollAxes);
    };
    pollAxes();
    return ()=>cancelAnimationFrame(animationId);
  }, [armConnectedOne, onArmVelocitiesChange])


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
    style={{
      display: 'flex',
      justifyContent: 'center',
      textAlign: 'center',
      cursor: 'pointer',
      position: 'relative',
      marginRight: 20
    }}
    >
      <span style={{ whiteSpace: 'pre-wrap' }}>
        GAMEPADS: {currentView !== "ArmView" 
          ? (driveConnectedOne != null ? "CONNECTED" : "DISCONNECTED")
          : (armConnectedOne != null ? "CONNECTED" : "DISCONNECTED")}
      </span>
      <Collapse in={open}>
        <Paper sx={{textAlign:'center', maxHeight:200,width:400,overflowX:'hidden',overflowY:'auto',left:'50%',transform: 'translateX(-50%)',position:'absolute',top:'100%', zIndex:1300, padding: 1}}>
          <Button
            size="small"
            disabled={page === "Drive"}
            onClick={() => setPage("Drive")}
          >
            ← Drive
          </Button>
          <Button
            size="small"
            disabled={page === "Arm"}
            onClick={() => setPage("Arm")}
          >
            Arm →
          </Button>
          {page==='Drive'?<GamepadDiv gpList={gpList} connectedOne={driveConnectedOne} setConnectedOne={setDriveConnectedOne} name={page}/>:
          <GamepadDiv gpList={armList} connectedOne={armConnectedOne} setConnectedOne={setArmConnectedOne} name={page} />}
        </Paper>
      </Collapse>
    </div>
  );
}
