// React imports
import { useState, useEffect, use } from "react";
// MUI components
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";

// Local imports
//import "./App.css";
import TopAppBar from "../components/ui/TopAppBar";
import DriveView from "./DriveView";
import ArmView from "./ArmView";
import SpeedTestView from "./SpeedTestView";
import ScienceView from "./ScienceView";
import AutonomyView from "./AutonomyView";
import FullscreenMap from "./MapView";
import RecordingsView from "./Recordings";

function App() {
  const [currentView, setCurrentView] = useState("DriveView");
  const [sidewaysVelocity, setSidewaysVelocity] = useState(0);
  const [forwardsVelocity, setForwardVelocity] = useState(0);
  const [rotationalVelocity, setRotationalVelocity] = useState(0);
  const [panHeightVelocity, setPanHeightVelocity]=useState("0");
  const [panWidthVelocity, setPanWidthVelocity]=useState("0");
  const [armConnectedOne,setArmConnectedOne]=useState(null)

  const [effector,setEffector]=useState(0);
  const [elbow,setElbow]=useState(0);
  const [shoulder,setShoulder]=useState(0);
  const [pitch,setPitch]=useState(0);
  const [track,setTrack]=useState(0);
  const [roll, setRoll]=useState(0);

  const [moduleConflicts,setModuleConflicts]=useState(false)

  const handleVelocitiesChange = ({ lx, ly, rx }) => {
    setSidewaysVelocity(lx);
    setForwardVelocity(ly);
    setRotationalVelocity(rx);
    console.log(lx,ly,rx)
  };
  const handlePanVelocitiesChange=({px,py})=>{
    setPanHeightVelocity(py.toFixed(2));
    setPanWidthVelocity(px.toFixed(2));
  }


  const handleArmVelocitiesChange = ({Effector,Elbow,Shoulder,Track,Pitch,Roll, armConnectedOne}) =>{
    console.log(Effector,Elbow,Shoulder,Roll,Pitch,Track, armConnectedOne)
    setArmConnectedOne(armConnectedOne)
    setEffector(Effector)
    setElbow(Elbow)
    setPitch(Pitch)
    setRoll(Roll)
    setTrack(Track)
    setShoulder(Shoulder)
    console.log(armConnectedOne)
    console.log(effector,pitch,roll,elbow,shoulder,track)
  }
  


  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case 'ArmView':
        return <ArmView effector={effector} pitch={pitch} roll={roll} shoulder={shoulder} elbow={elbow} track={track} armConnectedOne={armConnectedOne}/>
      case "DriveView":
        return <DriveView moduleConflicts={moduleConflicts} sidewaysVelocity={sidewaysVelocity} forwardsVelocity={forwardsVelocity} rotationalVelocity={rotationalVelocity} panHeightVelocity={panHeightVelocity}  panWidthVelocity={panWidthVelocity}/>;
      case "SpeedTestView":
        return <SpeedTestView />;
      case "ScienceView":
        return <ScienceView />;
      case "AutonomyView":
        return <AutonomyView />;
      case "MapView":
        return <FullscreenMap />;
      case "RecordingsView":
        return <RecordingsView />;  
      default:
        return <div>Select a view</div>;
    }
  }

  return (
    <Box sx={{ display: "flex", flexGrow: 1, flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <CssBaseline />{/* Normalizes styles */}
      <TopAppBar setModuleConflicts={setModuleConflicts} currentView={currentView} setCurrentView={setCurrentView} onVelocitiesChange={handleVelocitiesChange} onArmVelocitiesChange={handleArmVelocitiesChange} onPanVelocitiesChange= {handlePanVelocitiesChange}/>
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
