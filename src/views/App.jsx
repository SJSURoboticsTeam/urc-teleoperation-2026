// React imports
import { useState, useEffect } from "react";
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
import ArmCommandProvider from "../providers/ArmCommandProvider";
import DriveCommandProvider from "../providers/DriveCommandProvider";
import MastCommandProvider from "../providers/MastCommandProvider";
import GamepadProvider from "../providers/GamepadProvider";
import AutonomyModeProvider from "../providers/AutonomyModeProvider";
import PeripheralProvider from "../providers/PeripheralProvider";
import { SnackbarProvider, useSnackbar } from "notistack";
import SerialProvider from "../providers/SerialProvider";

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
  });

  const [mastCommands, setMastCommands] = useState({
    px: 0,
    py: 0,
    panSpeed: 30,
  });

  // controls whether to render cams, content, or both
  const STORAGE_KEY = "missionControl.splitmode";
  const [selectedElements, setSelectedElements] = useState("both");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const value = typeof parsed === "string" ? parsed : "both";
        const next =
          value === "ui" || value === "both" || value === "cameras"
            ? value
            : "both";
        setSelectedElements(next);
      }
    } catch {
      // ignore storage errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedElements));
    } catch {
      // ignore errors
    }
  }, [selectedElements, hydrated]);

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
        <SerialProvider>
          <PeripheralProvider>
            <AutonomyModeProvider
              autonomyEnabled={autonomyEnabled}
              setAutonomyEnabled={setAutonomyEnabled}
            >
              <ArmCommandProvider
                armCommands={armCommands}
                setArmCommands={setArmCommands}
              >
                <GamepadProvider
                  connectedGamepads={connectedGamepads}
                  setConnectedGamepads={setConnectedGamepads}
                >
                  <DriveCommandProvider
                    driveCommands={driveCommands}
                    setDriveCommands={setDriveCommands}
                  >
                    <MastCommandProvider
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
                    </MastCommandProvider>
                  </DriveCommandProvider>
                </GamepadProvider>
              </ArmCommandProvider>
            </AutonomyModeProvider>
          </PeripheralProvider>
        </SerialProvider>
      </SnackbarProvider>
    </Box>
  );
}

export default App;
