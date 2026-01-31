// React imports
import { useState, useEffect } from "react";
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
  


  // Select which view we want to display
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
      <TopAppBar setModuleConflicts={setModuleConflicts} currentView={currentView} setCurrentView={setCurrentView} onVelocitiesChange={handleVelocitiesChange} onArmVelocitiesChange={handleArmVelocitiesChange} onPanVelocitiesChange={handlePanVelocitiesChange} driveConnectedOne={driveConnectedOne} setDriveConnectedOne={setDriveConnectedOne} camsVisibility={camsVisibility} setcamsVisibility={setcamsVisibility}/>
      
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
