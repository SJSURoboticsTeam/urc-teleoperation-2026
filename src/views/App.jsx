// React imports
import { useState, useEffect } from "react";
import { socket } from "../components/socket.io/socket";
// MUI components
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";

// Local imports
//import "./App.css";
import TopAppBar from "../components/ui/TopAppBar";
import DriveComponents from "./DriveView";
import ArmView from "./ArmView";
import ScienceView from "./ScienceView";
import AutonomyView from "./AutonomyView";
import SplitView from "./SplitView"
import ExtrasView from "./ExtrasView"

function App() {
  const [currentView, setCurrentView] = useState("DriveView");
  const [sidewaysVelocity, setSidewaysVelocity] = useState(0);
  const [forwardsVelocity, setForwardVelocity] = useState(0);
  const [rotationalVelocity, setRotationalVelocity] = useState(0);
  const [panHeightVelocity, setPanHeightVelocity]=useState(0);
  const [panWidthVelocity, setPanWidthVelocity]=useState(0);
  const [armConnectedOne,setArmConnectedOne]=useState(null)
  const [driveConnectedOne, setDriveConnectedOne] = useState(null);

  const [effector,setEffector]=useState(0);
  const [elbow,setElbow]=useState(0);
  const [shoulder,setShoulder]=useState(0);
  const [pitch,setPitch]=useState(0);
  const [track,setTrack]=useState(0);
  const [roll, setRoll]=useState(0);

  const [moduleConflicts,setModuleConflicts]=useState(0)
  const [camsVisibility, setcamsVisibility] = useState(true)
  const [missionMode, setMissionMode] = useState(null)
  const [syncToMissionState, setSyncToMissionState] = useState(true)

  const handleVelocitiesChange = ({ lx, ly, rx }) => {
    setSidewaysVelocity(lx);
    setForwardVelocity(ly);
    setRotationalVelocity(rx);
    // console.log(lx,ly,rx)
  };
  const handlePanVelocitiesChange=({px,py})=>{
    setPanHeightVelocity(py);
    setPanWidthVelocity(px);
  }


  const handleArmVelocitiesChange = ({Effector,Elbow,Shoulder,Track,Pitch,Roll, armConnectedOne}) =>{
    // console.log(Effector,Elbow,Shoulder,Roll,Pitch,Track, armConnectedOne)
    setArmConnectedOne(armConnectedOne)
    setEffector(Effector)
    setElbow(Elbow)
    setPitch(Pitch)
    setRoll(Roll)
    setTrack(Track)
    setShoulder(Shoulder)
    //console.log(armConnectedOne)
    //console.log(effector,pitch,roll,elbow,shoulder,track)
  }

  useEffect(() => {
    const handler = (data) => {
      if (!data?.mode) return
        setMissionMode(data.mode)
      if (syncToMissionState) {
        setCurrentView((prev) => (prev === data.mode ? prev : data.mode))
      }
    }
    socket.on("missionState", handler)
    return () => {
      socket.off("missionState", handler)
    }
  }, [syncToMissionState])
  
  function renderView() {
    switch (currentView) {
      case "ArmView":
        return <SplitView CurrentView={ <ArmView effector={effector} pitch={pitch} roll={roll} shoulder={shoulder} elbow={elbow} track={track} armConnectedOne={armConnectedOne}/> } showCameras={camsVisibility} />;
      case "DriveView":
        return <SplitView CurrentView={ <DriveComponents moduleConflicts={moduleConflicts} sidewaysVelocity={sidewaysVelocity} forwardsVelocity={forwardsVelocity} rotationalVelocity={rotationalVelocity} panHeightVelocity={panHeightVelocity}  panWidthVelocity={panWidthVelocity} driveConnectedOne={driveConnectedOne} setDriveConnectedOne={setDriveConnectedOne} /> } showCameras={camsVisibility} />;
      case "ExtrasView":
        return <SplitView CurrentView={<ExtrasView /> } showCameras={camsVisibility} />;
      case "ScienceView":
        return <SplitView CurrentView={<ScienceView /> } showCameras={camsVisibility} />;
      case "AutonomyView":
        return <SplitView CurrentView={<AutonomyView/> } showCameras={camsVisibility} />;
      default:
        return <div>Select a view</div>;
    }
  }

  return (
    <Box sx={{ display: "flex", flexGrow: 1, flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <CssBaseline />{/* Normalizes styles */}
      <TopAppBar setModuleConflicts={setModuleConflicts} currentView={currentView} setCurrentView={setCurrentView} onVelocitiesChange={handleVelocitiesChange} onArmVelocitiesChange={handleArmVelocitiesChange} onPanVelocitiesChange={handlePanVelocitiesChange} driveConnectedOne={driveConnectedOne} setDriveConnectedOne={setDriveConnectedOne} camsVisibility={camsVisibility} setcamsVisibility={setcamsVisibility} missionMode={missionMode} syncToMissionState={syncToMissionState} setSyncToMissionState={setSyncToMissionState}/>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
          marginTop: '64px'
        }}
      >
        {renderView()}
      </Box>
    </Box>
  );
}

export default App;
