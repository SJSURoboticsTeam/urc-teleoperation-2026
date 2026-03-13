  import { useState, useEffect } from "react";
  import {
    AppBar,
    Toolbar,
    Drawer,
    List,
    ListItem,
    Typography,
    IconButton,
    Button,
    FormControlLabel,
    Checkbox,
  } from "@mui/material";
  import MenuIcon from "@mui/icons-material/Menu";
  import FullscreenIcon from "@mui/icons-material/Fullscreen";
  import { orange } from "@mui/material/colors";
  import NavConnectionStatus from "../socket.io/BackendConnectionManager";
  import GamepadPanel from "../gamepad/Gamepad";
  import Metrics from "../metrics/metrics";
  import StateMachine from "../statemachine/statemachine";

  export default function TopAppBar({
    moduleConflicts,
    setCurrentView,
    onVelocitiesChange,
    onArmVelocitiesChange,
    currentView,
    setModuleConflicts,
    driveConnectedOne,
    setDriveConnectedOne,
    camsVisibility,
    setcamsVisibility,
    panAngles,
    setPanAngles,
    panSpeed,
    setErrorMessage,
    errorMessage,
  }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [driveGamepads, setDriveGamepads] = useState({});
    const [armGamepads, setArmGamepads] = useState({});
    const [openPane, setOpenPane] = useState("None");

    const toggleDrawer = (open) => () => {
      setDrawerOpen(open);
    };

    const handleViewChange = (view) => setCurrentView(view);

    useEffect(() => {
      const handleConnect = (e) => {
        const gp = e.gamepad;
        // check if a gamepad is a drive or arm controller based on id containing "Standard" or "Extreme"
        if (/STANDARD/i.test(gp.id)) {
          setDriveGamepads((prev) => ({ ...prev, [gp.index]: gp }));
        } else if (/EXTREME/i.test(gp.id)) {
          setArmGamepads((prev) => ({ ...prev, [gp.index]: gp }));
        }
      };

      const handleDisconnect = (e) => {
        setDriveGamepads((prev) => {
          const copy = { ...prev };
          delete copy[e.gamepad.index];
          return copy;
        });
        setArmGamepads((prev) => {
          const copy = { ...prev };
          delete copy[e.gamepad.index];
          return copy;
        });
      };

      window.addEventListener("gamepadconnected", handleConnect);
      window.addEventListener("gamepaddisconnected", handleDisconnect);

      return () => {
        window.removeEventListener("gamepadconnected", handleConnect);
        window.removeEventListener("gamepaddisconnected", handleDisconnect);
      };
    }, []);

    return (
      <>
        <AppBar
          sx={{
            bgcolor:
              import.meta.env.MODE === "production" ||
              import.meta.env.MODE === "prod"
                ? orange[700]
                : undefined,
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            {/* sx: hide "Teleoperations" title on phones in portrait mode so menubar fits */}
            <Typography
              variant="h6"
              component="div"
              sx={{
                display: { xs: "none", sm: "none", md: "block" },
                pr: 1, // add left padding to align with toolbar items
              }}
            >
              Teleoperations
            </Typography>
            


            {/* Buttons to change between views */}
            <div style={{ display: "flex" }}>
              <Button
                sx={{
                display: { xs: "none", md: "inline-flex" },
                bgcolor: currentView === "DriveView" ? "rgba(255,255,255,0.2)" : "transparent"
              }}
              color="inherit"
              onClick={() => handleViewChange("DriveView")}>Drive
              </Button>

              <Button
                sx={{
                display: { xs: "none", md: "inline-flex" },
                bgcolor: currentView === "ArmView" ? "rgba(255,255,255,0.2)" : "transparent"
              }}
              color="inherit"
              onClick={() => handleViewChange("ArmView")}>Arm
              </Button>

              <Button
                sx={{
                display: { xs: "none", md: "inline-flex" },
                bgcolor: currentView === "ScienceView" ? "rgba(255,255,255,0.2)" : "transparent"
              }}
                color="inherit"
                onClick={() => handleViewChange("ScienceView")}>Science
              </Button>

              <Button
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  bgcolor: currentView === "AutonomyView" ? "rgba(255,255,255,0.2)" : "transparent"
                }}
                color="inherit"
                onClick={() => handleViewChange("AutonomyView")}>Autonomy</Button>

              <Button
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  bgcolor: currentView === "ExtrasView" ? "rgba(255,255,255,0.2)" : "transparent"
                }}
                color="inherit"
                onClick={() => handleViewChange("ExtrasView")}>Extras
              </Button>
              </div>


            {/* fill the space between the buttons and the connection status */}
            <div style={{ flexGrow: 1 }} />

            {/* Gamepad connection status and selection panel */}

            <GamepadPanel
              openPane={openPane}
              setOpenPane={setOpenPane}
              name="Drive"
              setModuleConflicts={setModuleConflicts}
              onDriveVelocitiesChange={onVelocitiesChange}
              driveGamepads={driveGamepads}
              armGamepads={armGamepads}
              currentView={currentView}
              driveConnectedOne={driveConnectedOne}
              setDriveConnectedOne={setDriveConnectedOne}
              moduleConflicts={moduleConflicts}
              panAngles={panAngles}
              panSpeed={panSpeed}
              setPanAngles={setPanAngles}
            />
            <NavConnectionStatus
              openPane={openPane}
              setOpenPane={setOpenPane}
              setErrorMessage={setErrorMessage}
              errorMessage={errorMessage}
            />
            <Metrics openPane={openPane} setOpenPane={setOpenPane} />
            <StateMachine openPane={openPane} setOpenPane={setOpenPane} />

            <IconButton
              edge="end"
              color="inherit"
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen(); // enter fullscreen
                } else {
                  document.exitFullscreen(); // exit fullscreen
                }
              }}
            >
              <FullscreenIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
{/* Drawer for side panel components */}
<Drawer
  anchor="left"
  open={drawerOpen}
  onClose={toggleDrawer(false)}
  sx={{
    "& .MuiDrawer-paper": {
      width: 240,
    },
  }}
>
  <List>

    <ListItem sx={{ display: { xs: "flex", md: "none" } }} button onClick={() => handleViewChange("DriveView")}>
      <Typography sx={{ color: "black" }}>Drive</Typography>
    </ListItem>

    <ListItem sx={{ display: { xs: "flex", md: "none" } }} button onClick={() => handleViewChange("ArmView")}>
      <Typography sx={{ color: "black" }}>Arm</Typography>
    </ListItem>

    <ListItem sx={{ display: { xs: "flex", md: "none" } }} button onClick={() => handleViewChange("ScienceView")}>
      <Typography sx={{ color: "black" }}>Science</Typography>
    </ListItem>

    <ListItem sx={{ display: { xs: "flex", md: "none" } }} button onClick={() => handleViewChange("AutonomyView")}>
      <Typography sx={{ color: "black" }}>Autonomy</Typography>
    </ListItem>

    <ListItem sx={{ display: { xs: "flex", md: "none" } }} button onClick={() => handleViewChange("ExtrasView")}>
      <Typography sx={{ color: "black" }}>Extras</Typography>
    </ListItem>
    <ListItem></ListItem>
    <ListItem></ListItem>
    <ListItem>
      <Typography sx={{ color: "black" }} variant="h6">
        SETTINGS
      </Typography>
    </ListItem>

    <ListItem>
      <FormControlLabel
        control={
          <Checkbox
            checked={camsVisibility}
            onChange={(e) => setcamsVisibility(e.target.checked)}
          />
        }
        label="Show Cameras"
      />
    </ListItem>

  </List>
</Drawer>
      </>
    );
  }
