import { useState } from "react";
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
  setCurrentView,
  onVelocitiesChange,
  currentView,
  moduleConflicts,
  setModuleConflicts,
  panAngles,
  setPanAngles,
  panSpeed,
  camsVisibility,
  setcamsVisibility,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openPane, setOpenPane] = useState("None");

  // const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleViewChange = (view) => setCurrentView(view);

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
          <Button color="inherit" onClick={() => handleViewChange("DriveView")}>
            Drive
          </Button>
          <Button color="inherit" onClick={() => handleViewChange("ArmView")}>
            Arm
          </Button>
          <Button
            color="inherit"
            onClick={() => handleViewChange("ScienceView")}
          >
            Science
          </Button>
          <Button
            color="inherit"
            onClick={() => handleViewChange("AutonomyView")}
          >
            Autonomy
          </Button>
          <Button
            color="inherit"
            onClick={() => handleViewChange("ExtrasView")}
          >
            Extras
          </Button>

          {/* fill the space between the buttons and the connection status */}
          <div style={{ flexGrow: 1 }} />

          {/* Gamepad connection status and selection panel */}
          <GamepadPanel
            openPane={openPane}
            setOpenPane={setOpenPane}
            name="Drive"
            moduleConflicts={moduleConflicts}
            setModuleConflicts={setModuleConflicts}
            onDriveVelocitiesChange={onVelocitiesChange}
            currentView={currentView}
            panAngles={panAngles}
            panSpeed={panSpeed}
            setPanAngles={setPanAngles}
          />
          <NavConnectionStatus openPane={openPane} setOpenPane={setOpenPane} />
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
      {/* Drawer for side panel comopnents */}
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
