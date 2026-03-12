// React imports
import { useState } from "react";
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
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

// Context imports
import ArmCommandContext from "../contexts/ArmCommandContext";
import DriveCommandContext from "../contexts/DriveCommandContext";
import GamepadContext from "../contexts/GamepadContext";
import MastCommandContext from "../contexts/MastCommandContext";

function App() {
  const [currentView, setCurrentView] = useState("DriveView");

  // const [panAngles, setPanAngles] = useState({
  //   px: 0,
  //   py: 0,
  // });
  // const [panSpeed, setPanSpeed] = useState(30);
  const [errorMessage, setErrorMessage] = useState("");

  // list of gamepads and the connected one for drive and arm
  const [connectedGamepads, setConnectedGamepads] = useState({
    driveGPList: [], // list of drive gamepads (to display)
    armGPList: [], // list of arm gamepads (to display)
    drive: null, // index of selected drive gamepad
    arm: null, // index of selected arm gamepad
  });

  const [armCommands, setArmCommands] = useState({
    track: 0,
    shoulder: 0,
    elbow: 0,
    pitch: 0,
    roll: 0,
    clamp: 0,
  });

  const [driveCommands, setDriveCommands] = useState({
    sidewaysVelocity: 0,
    forwardsVelocity: 0,
    rotationalVelocity: 0,
    moduleConflicts: 1,
  });

  const [mastCommands, setMastCommands] = useState({
    px: 0,
    py: 0,
    panSpeed: 30,
  });

  const [camsVisibility, setcamsVisibility] = useState(true);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setErrorMessage("");
  };
  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case "ArmView":
        return (
          <SplitView CurrentView={<ArmView />} showCameras={camsVisibility} />
        );
      case "DriveView":
        return (
          <SplitView
            CurrentView={<DriveComponents />}
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
      {/*!!errorMessage converts string to clean boolean (ie if theres a message show it */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleClose}
      >
        <Alert
          onClose={handleClose}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Error: {errorMessage}
        </Alert>
      </Snackbar>
      <ArmCommandContext
        armCommands={armCommands}
        setArmCommands={setArmCommands}
      >
        <GamepadContext
          connectedGamepads={connectedGamepads}
          setConnectedGamepads={setConnectedGamepads}
        >
          <DriveCommandContext
            driveCommands={driveCommands}
            setDriveCommands={setDriveCommands}
          >
            <MastCommandContext
              mastCommands={mastCommands}
              setMastCommands={setMastCommands}
            >
              <CssBaseline />
              {/* Normalizes styles */}
              <TopAppBar
                currentView={currentView}
                setCurrentView={setCurrentView}
                camsVisibility={camsVisibility}
                setcamsVisibility={setcamsVisibility}
                setErrorMessage={setErrorMessage}
                errorMessage={errorMessage}
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
                  marginTop: "60px",
                }}
              >
                {renderView()}
              </Box>
            </MastCommandContext>
          </DriveCommandContext>
        </GamepadContext>
      </ArmCommandContext>
    </Box>
  );
}

export default App;
