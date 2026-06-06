// React imports
import { useState } from "react";
// MUI components
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
// React router components
import { Outlet } from "react-router-dom";

// Local imports
import TopAppBar from "./TopAppBar";
import SplitView from "./SplitView";
// PANE IMPORTS, ROUTES HAS MOVED TO MAIN.JSX

// Context imports
import ArmCommandContext from "../contexts/ArmCommandContext";
import DriveCommandContext from "../contexts/DriveCommandContext";
import GamepadContext from "../contexts/GamepadContext";
import MastCommandContext from "../contexts/MastCommandContext";
import AutonomyModeProvider from "../contexts/AutonomyModeContext";
import { SnackbarProvider, useSnackbar } from "notistack";

function App() {
  // Global autonomy state so every view can react to it
  // Start in TELEOP mode on initial load
  const [autonomyEnabled, setAutonomyEnabled] = useState(false);

  //snackbar
  const { enqueueSnackbar } = useSnackbar();

  const addSnackbarMessage = (message, variant) => () => {
    // variant could be success, error, warning, info, or default
    enqueueSnackbar({ message }, { variant });
  };

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
  
// controls whether to render cams, content, or both
  const [selectedElements, setSelectedElements] = useState("both");

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
      {/* snackbar */}
      <SnackbarProvider maxSnack={5}>
        <AutonomyModeProvider
          autonomyEnabled={autonomyEnabled}
          setAutonomyEnabled={setAutonomyEnabled}
        >
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
                    selectedElements={selectedElements}
                    setSelectedElements={setSelectedElements}
                    addSnackbarMessage={addSnackbarMessage}
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
                    <SplitView selectedElements={selectedElements}>
                      {/* we pass all these elements as "children" into SplitView */}
                          <Outlet />
                    </SplitView>
                  </Box>
                </MastCommandContext>
              </DriveCommandContext>
            </GamepadContext>
          </ArmCommandContext>
        </AutonomyModeProvider>
      </SnackbarProvider>
    </Box>
  );
}

export default App;
