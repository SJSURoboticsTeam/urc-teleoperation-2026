// React imports
import { useState, useEffect } from "react";
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

  const handleVelocitiesChange = ({ lx, ly, rx }) => {
    setSidewaysVelocity(lx.toFixed(2));
    setForwardVelocity(ly.toFixed(2));
    setRotationalVelocity(rx.toFixed(2));
  };

  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case 'ArmView':
        return <ArmView />
      case "DriveView":
        return <DriveView sidewaysVelocity={sidewaysVelocity} forwardsVelocity={forwardsVelocity} rotationalVelocity={rotationalVelocity}/>;
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
      <TopAppBar setCurrentView={setCurrentView} onVelocitiesChange={handleVelocitiesChange} />
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
