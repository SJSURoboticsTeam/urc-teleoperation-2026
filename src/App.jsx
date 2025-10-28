// React imports
import { useState, useEffect, use } from "react";
// MUI components
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";

// Local imports
//import "./App.css";
import TopAppBar from "./components/TopAppBar";
import DriveView from "./views/DriveView";
import ArmView from "./views/ArmView";
import SpeedTestView from "./views/SpeedTestView";
import ScienceView from "./views/ScienceView";
import AutonomyView from "./views/AutonomyView";
import FullscreenMap from "./views/MapView";
import RecordingsView from "./views/Recordings";

function App() {
  const [currentView, setCurrentView] = useState("DriveView");
  const [sidewaysVelocity, setSidewaysVelocity] = useState("0");
  const [forwardsVelocity, setForwardVelocity] = useState("0");
  const [rotationalVelocity, setRotationalVelocity] = useState("0");
  const [panHeightVelocity, setPanHeightVelocity]=useState("0");
  const [panWidthVelocity, setPanWidthVelocity]=useState("0");
  const [armConnectedOne,setArmConnectedOne]=useState(null)

  const [effector,setEffector]=useState(0);
  const [elbow,setElbow]=useState(0);
  const [shoulder,setShoulder]=useState(0);
  const [pitch,setPitch]=useState(0);
  const [track,setTrack]=useState(0);
  const [roll, setRoll]=useState(0);

  const handleVelocitiesChange = ({ lx, ly, rx  }) => {
    setSidewaysVelocity(lx.toFixed(2));
    setForwardVelocity(ly.toFixed(2));
    setRotationalVelocity(rx.toFixed(2));
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
        return <DriveView sidewaysVelocity={sidewaysVelocity} forwardsVelocity={forwardsVelocity} rotationalVelocity={rotationalVelocity} panHeightVelocity={panHeightVelocity}  panWidthVelocity={panWidthVelocity}/>;
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
      <TopAppBar currentView={currentView} setCurrentView={setCurrentView} onVelocitiesChange={handleVelocitiesChange} onArmVelocitiesChange={handleArmVelocitiesChange } onPanVelocitiesChange= {handlePanVelocitiesChange} />
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
