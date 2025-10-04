// React imports
import { useState, useEffect } from "react";
// MUI components
import Box from '@mui/material/Box'
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

function App() {
  const [currentView, setCurrentView] = useState("DriveView");
  const [sidewaysVelocity, setSidewaysVelocity] = useState("0");
  const [forwardsVelocity, setForwardVelocity] = useState("0");
  const [rotationalVelocity, setRotationalVelocity] = useState("0");

  const handleVelocitiesChange = ({ lx, ly, rx }) => {
    setSidewaysVelocity(lx.toFixed(2));
    setForwardVelocity(ly.toFixed(2));
    setRotationalVelocity(rx.toFixed(2));
  };

  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case 'DriveView':
        return <DriveView sidewaysVelocity={sidewaysVelocity}
          forwardsVelocity={forwardsVelocity}
          rotationalVelocity={rotationalVelocity} />
      case 'ArmView':
        return <ArmView />
      case "DriveView":
        return <DriveView />;
      case "ArmView":
        return <ArmView />;
      case "SpeedTestView":
        return <SpeedTestView />;
      case "ScienceView":
        return <ScienceView />;
      case "AutonomyView":
        return <AutonomyView />;
      case "MapView":
        return <FullscreenMap />;
      default:
        return <div>Select a view</div>;
    }
  }

  return (
    <Box sx={{ display: "flex", flexGrow: 1, flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <CssBaseline /> Normalizes styles
      <div>easter egg :))</div>
      <TopAppBar setCurrentView={setCurrentView} onVelocitiesChange={handleVelocitiesChange}></TopAppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          mt:10,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
              <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {renderView()}
      </Box>
        </Box>

      
    </Box>
  );
}

export default App;
