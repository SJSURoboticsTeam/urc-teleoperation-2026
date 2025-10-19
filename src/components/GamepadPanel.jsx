import { useState, useEffect } from "react";
import { Button, Collapse, Paper } from "@mui/material";
import GamepadDiv from "./drive/DriveGamepad";
import {FrameRateConstant} from './drive/FrameRateConstant'

export default function GamepadPanel({ driveGamepads, onDriveVelocitiesChange, armGamepads, onArmVelocitiesChange, currentView, setModuleConflicts }) {
  const [driveConnectedOne, setDriveConnectedOne] = useState(null);
  const [driveVelocities, setDriveVelocities] = useState({ lx: 0, ly: 0, rx: 0 });
  const [open, setOpen] = useState(false);
  const [armConnectedOne, setArmConnectedOne] = useState(null);
  const [page,setPage]=useState('Drive');
  const [prevTime,setPrevTime]=useState();
  const [armVelocities, setArmVelocities]=useState({'Elbow':0,'Shoulder':0,'Track':0,'Pitch':0,'Roll':0,'Effector':0})
  
  useEffect(() => {
    if (driveConnectedOne == null) {
      setDriveVelocities({ lx: 0, ly: 0, rx: 0 });
      onDriveVelocitiesChange?.({ lx: 0, ly: 0, rx: 0 });
      return;
    }
    const pollAxes = () => {
      const gp = navigator.getGamepads()[driveConnectedOne];
      if (gp) {
        const newVel = {
          lx: Math.round(gp.axes[0]) || 0,
          ly: -1* Math.round((gp.axes[1]) || 0),
          rx: Math.round(gp.axes[2]) || 0,
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
    const intervalId = setInterval(pollAxes, FrameRateConstant);
    console.log(`Polling drive gamepad every ${FrameRateConstant}ms`);
    return () => clearInterval(intervalId);
  }, [driveConnectedOne]);

  useEffect(()=>{
    if (armConnectedOne==null) {
      setArmVelocities({'Elbow':0,'Shoulder':0,'Track':0,'Pitch':0,'Roll':0,'Effector':0})
      onArmVelocitiesChange?.({'Elbow':0,'Shoulder':0,'Track':0,'Pitch':0,'Roll':0,'Effector':0, armConnectedOne})
      return;
    }
    const pollAxes=()=>{
      const gp=navigator.getGamepads()[armConnectedOne];
      if (gp) {
        /**
         * Effector,Elbow,Shoulder,Track,Pitch,Roll, armConnectedOne
         */
        // rand mapping to test socket.emit and arm/drive ui
        const newVal= {
          'Elbow':gp.axes[9],
          'Shoulder':gp.axes[1],
          'Track':gp.axes[3],
          'Pitch':gp.axes[0],
          'Roll':gp.axes[5],
          'Effector':gp.axes[6],
          armConnectedOne}
        setArmVelocities((prev) => {
        const changed = Object.keys(newVal).some(
          (key) => newVal[key] !== prev[key]
        );
        if (changed) {
          onArmVelocitiesChange?.({ ...newVal, armConnectedOne });
          return newVal;
        }
        onArmVelocitiesChange?.({...prev,armConnectedOne})
        return prev;
        });
      }
    };
    const intervalId = setInterval(pollAxes, FrameRateConstant);
    console.log(`Polling arm gamepad every ${FrameRateConstant}ms`);
    return () => clearInterval(intervalId);
  }, [armConnectedOne])


  //console.log(driveGamepads) //dbg
  const gpList = Object.values(driveGamepads);
  //console.log(gpList); //dbg

  //console.log(armGamepads) //dbg
  const armList=Object.values(armGamepads);
  //console.log(armList); //dbg

  const [info, setInfo] = useState('');

  useEffect(() => {
    if (currentView === 'DriveView') {
      setInfo(driveConnectedOne != null ? ': CONNECTED' : ': DISCONNECTED');
    } else if (currentView === 'ArmView') {
      setInfo(armConnectedOne != null ? ': CONNECTED' : ': DISCONNECTED');
    } else {
      setInfo(''); // empty string if neither view
    }
  }, [currentView, driveConnectedOne, armConnectedOne]);


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
        GAMEPADS{info}
      </span>
      <Collapse in={open}>
        <Paper sx={{textAlign:'center', maxHeight:225,width:400,overflowX:'hidden',overflowY:'auto',left:'50%',transform: 'translateX(-50%)',position:'absolute',top:'100%', zIndex:1300, padding: 1}}>
          <Button
            size="small"
            sx={{textDecoration:page==='Drive'?'underline':'none',
              color:page==='Drive'?'black':'gray',
               '&:hover': {textDecoration:page==='Drive'?'underline':'none'}
            }}
            onClick={() => setPage("Drive")}
          >
            Drive
          </Button>
          <Button
            size="small"
            sx={{textDecoration:page==='Arm'?'underline':'none',
                 color:page==='Arm'?'black':'gray',
                '&:hover': {textDecoration:page==='Arm'?'underline':'none'}
            }}
            onClick={() => setPage("Arm")}
          >
            Arm 
          </Button>
          {page==='Drive'?<GamepadDiv setModuleConflicts={setModuleConflicts} gpList={gpList} connectedOne={driveConnectedOne} setConnectedOne={setDriveConnectedOne} name={page}/>:
          <GamepadDiv gpList={armList} connectedOne={armConnectedOne} setConnectedOne={setArmConnectedOne} name={page} />}
        </Paper>
      </Collapse>
    </div>
  );
}
