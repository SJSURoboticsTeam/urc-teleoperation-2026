import { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Drawer,
  List,
  ListItem,
  Typography,
  IconButton,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  Tooltip,
  ListItemButton,
  Box
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { orange } from "@mui/material/colors";
import NavConnectionStatus from "../socket.io/BackendConnectionManager";
import GamepadPanel from "../gamepad/Gamepad";
import Metrics from "../metrics/metrics";
import StateMachine from "../statemachine/statemachine";
import { robotsocket, useRobotSocketStatus } from "../socket.io/socket";

export default function TopAppBar({
  setCurrentView,
  currentView,
  camsVisibility,
  setcamsVisibility,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openPane, setOpenPane] = useState("None");

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleViewChange = (view) => setCurrentView(view);

  const [capsLockActive, setCapsLockState] = useState(false);
  const [estopStatus, setestopStatus] = useState("STANDBY"); //STANDBY, LOADING, KILLED
  const isRobotConnected = useRobotSocketStatus();

  function initiateEstop() {
    console.log("E-STOP!");
    setestopStatus("LOADING");
    // E_STOP vs E-STOP since python can't handle dashed function names
    robotsocket.emit("E_STOP", (response) => {
      if (response === "OK") {
        setestopStatus("KILLED");
        console.log("REMOTE KILL COMPLETE. ");
      }
    });
  }

  useEffect(() => {
    const updateCapsState = (e) => {
      setCapsLockState(e.getModifierState("CapsLock"));
    };

    window.addEventListener("keydown", updateCapsState);
    window.addEventListener("keyup", updateCapsState);

    return () => {
      window.removeEventListener("keydown", updateCapsState);
      window.removeEventListener("keyup", updateCapsState);
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
          <Typography
            variant="h6"
            component="div"
            sx={{
              pr: 1, // add left padding to align with toolbar items
              display: { xs: "none", md: "inline-flex" },
            }}
          >
            Teleoperations
          </Typography>
          <Box sx={{ display: { xs: "none", lg: "inline-flex" } }}>
            {/* Buttons to change between views */}
            <Button
              color="inherit"
              onClick={() => handleViewChange("DriveView")}
              sx={{
                bgcolor:
                  currentView === "DriveView"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
              }}
            >
              Drive
            </Button>
            <Button
              color="inherit"
              onClick={() => handleViewChange("ArmView")}
              sx={{
                bgcolor:
                  currentView === "ArmView"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
              }}
            >
              Arm
            </Button>
            <Button
              color="inherit"
              onClick={() => handleViewChange("ScienceView")}
              sx={{
                bgcolor:
                  currentView === "ScienceView"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
              }}
            >
              Science
            </Button>
            <Button
              color="inherit"
              onClick={() => handleViewChange("AutonomyView")}
              sx={{
                bgcolor:
                  currentView === "AutonomyView"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
              }}
            >
              Autonomy
            </Button>
            <Button
              color="inherit"
              onClick={() => handleViewChange("ExtrasView")}
              sx={{
                bgcolor:
                  currentView === "ExtrasView"
                    ? "rgba(255,255,255,0.2)"
                    : "transparent",
              }}
            >
              Extras
            </Button>
          </Box>

          {/* fill the space between the buttons and the connection status */}
          <div style={{ flexGrow: 1 }} />
          <Tooltip disableFocusListener title="USE CAPS LOCK TO ARM">
            <span>
              <Button
                sx={{
                  mr: 2,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
                variant="contained"
                color="error"
                loading={estopStatus == "LOADING"}
                disabled={!capsLockActive || !isRobotConnected}
                onClick={() => {
                  if (capsLockActive) {
                    initiateEstop();
                  }
                }}
              >
                E-STOP
              </Button>
            </span>
          </Tooltip>

          <Dialog
            open={estopStatus == "KILLED"}
            onClose={() => setestopStatus("idle")}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle color="red" id="alert-dialog-title">
              {"REMOTE KILL SUCCESS"}
            </DialogTitle>
          </Dialog>

          {/* Gamepad connection status and selection panel */}
          <GamepadPanel
            openPane={openPane}
            setOpenPane={setOpenPane}
            name="Drive"
            currentView={currentView}
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
          <Box sx={{ display: { xs: "block", lg: "none" } }}>
            <ListItem>
              <Typography sx={{ color: "black" }} variant="h6">
                VIEWS
              </Typography>
            </ListItem>
            <ListItemButton
              onClick={() => handleViewChange("DriveView")}
              sx={{
                bgcolor:
                  currentView === "DriveView"
                    ? "rgba(0, 0, 0, 0.2)"
                    : "transparent",
              }}
            >
              <Typography sx={{ color: "black" }}>Drive</Typography>
            </ListItemButton>

            <ListItemButton
              button
              onClick={() => handleViewChange("ArmView")}
              sx={{
                bgcolor:
                  currentView === "ArmView"
                    ? "rgba(0, 0, 0, 0.2)"
                    : "transparent",
              }}
            >
              <Typography sx={{ color: "black" }}>Arm</Typography>
            </ListItemButton>

            <ListItemButton
              button
              onClick={() => handleViewChange("ScienceView")}
              sx={{
                bgcolor:
                  currentView === "ScienceView"
                    ? "rgba(0, 0, 0, 0.2)"
                    : "transparent",
              }}
            >
              <Typography sx={{ color: "black" }}>Science</Typography>
            </ListItemButton>

            <ListItemButton
              onClick={() => handleViewChange("AutonomyView")}
              sx={{
                bgcolor:
                  currentView === "AutonomyView"
                    ? "rgba(0, 0, 0, 0.2)"
                    : "transparent",
              }}
            >
              <Typography sx={{ color: "black" }}>Autonomy</Typography>
            </ListItemButton>

            <ListItemButton
              button
              onClick={() => handleViewChange("ExtrasView")}
              sx={{
                bgcolor:
                  currentView === "ExtrasView"
                    ? "rgba(0, 0, 0, 0.2)"
                    : "transparent",
              }}
            >
              <Typography sx={{ color: "black" }}>Extras</Typography>
            </ListItemButton>
          </Box>
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
