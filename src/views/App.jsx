// React imports
import { useState, useEffect } from "react";
// MUI components
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";

// Local imports
import TopAppBar from "../components/ui/TopAppBar";
import DriveComponents from "./DriveView";
import ArmView from "./ArmView";
import ScienceView from "./ScienceView";
import AutonomyView from "./AutonomyView";
import SplitView from "./SplitView";
import ExtrasView from "./ExtrasView";

// Context imports
import ArmCommandContext from "../contexts/ArmCommandContext";

function App() {
  const [currentView, setCurrentView] = useState("DriveView");
  const [sidewaysVelocity, setSidewaysVelocity] = useState(0);
  const [forwardsVelocity, setForwardVelocity] = useState(0);
  const [rotationalVelocity, setRotationalVelocity] = useState(0);
  const [panHeightVelocity, setPanHeightVelocity] = useState(0);
  const [panWidthVelocity, setPanWidthVelocity] = useState(0);
  const [armConnectedOne, setArmConnectedOne] = useState(null);
  const [driveConnectedOne, setDriveConnectedOne] = useState(null);

  const [armCommands, setArmCommands] = useState({
    track: 0,
    shoulder: 0,
    elbow: 0,
    pitch: 0,
    roll: 0,
    clamp: 0,
  });

  const [moduleConflicts, setModuleConflicts] = useState(0);
  const [camsVisibility, setcamsVisibility] = useState(true);

  const handleVelocitiesChange = ({ lx, ly, rx }) => {
    setSidewaysVelocity(lx);
    setForwardVelocity(ly);
    setRotationalVelocity(rx);
    // console.log(lx,ly,rx)
  };
  const handlePanVelocitiesChange = ({ px, py }) => {
    setPanHeightVelocity(py);
    setPanWidthVelocity(px);
  };

  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case "ArmView":
        return (
          <SplitView
            CurrentView={
              <ArmView
                armConnectedOne={armConnectedOne}
              />
            }
            showCameras={camsVisibility}
          />
        );
      case "DriveView":
        return (
          <SplitView
            CurrentView={
              <DriveComponents
                moduleConflicts={moduleConflicts}
                sidewaysVelocity={sidewaysVelocity}
                forwardsVelocity={forwardsVelocity}
                rotationalVelocity={rotationalVelocity}
                panHeightVelocity={panHeightVelocity}
                panWidthVelocity={panWidthVelocity}
                driveConnectedOne={driveConnectedOne}
                setDriveConnectedOne={setDriveConnectedOne}
              />
            }
            showCameras={camsVisibility}
          />
        );
      case "ExtrasView":
        return (
          <SplitView
            CurrentView={<ExtrasView />}
            showCameras={camsVisibility}
          />
        );
      case "ScienceView":
        return (
          <SplitView
            CurrentView={<ScienceView />}
            showCameras={camsVisibility}
          />
        );
      case "AutonomyView":
        return (
          <SplitView
            CurrentView={<AutonomyView />}
            showCameras={camsVisibility}
          />
        );
      default:
        return <div>Select a view</div>;
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexGrow: 1,
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <ArmCommandContext 
        commands={armCommands}
        setArmCommands={setArmCommands}
      >
      <CssBaseline />
      {/* Normalizes styles */}
      <TopAppBar
        setModuleConflicts={setModuleConflicts}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onVelocitiesChange={handleVelocitiesChange}
        onPanVelocitiesChange={handlePanVelocitiesChange}
        driveConnectedOne={driveConnectedOne}
        setDriveConnectedOne={setDriveConnectedOne}
        camsVisibility={camsVisibility}
        setcamsVisibility={setcamsVisibility}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
          marginTop: "64px",
        }}
      >
        {renderView()}
      </Box>
      </ArmCommandContext>
    </Box>
  );
}

export default App;
