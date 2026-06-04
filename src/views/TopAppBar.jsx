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
  Dialog,
  DialogTitle,
  Tooltip,
  ListItemButton,
  Box,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { orange } from "@mui/material/colors";
import NavConnectionStatus from "../components/socket.io/BackendConnectionManager";
import GamepadPanel from "../components/gamepad/Gamepad";
import Metrics from "../components/metrics/metrics";
import StateMachine from "../components/statemachine/statemachine";
import {
  robotsocket,
  useRobotSocketStatus,
} from "../components/socket.io/socket";
import { useNavigate } from "react-router-dom";

export default function TopAppBar({ selectedElements, setSelectedElements }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openPane, setOpenPane] = useState("None");

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const navigate = useNavigate();

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

  const changeElements = (event, newAlignment) => {
    if (newAlignment !== null) {
      setSelectedElements(newAlignment);
    }
  };

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
            <Tabs
              // To prevent MUI console warning pretend it's on drive before / redirect
              // then truncate path for matchability, (/extras/graphs to /extras)
              value={
                location.pathname === "/"
                  ? "/drive"
                  : "/" + location.pathname.split("/")[1]
              }
              onChange={(e, value) => navigate(value)}
              role="navigation"
              TabIndicatorProps={{
                style: {
                  backgroundColor: "white",
                },
              }}
              sx={{
                "& .MuiTab-root": {
                  color: "white",
                  transition: "all 0.2s ease",
                  minWidth: "unset",
                  padding: "6px 12px",
                },

                "& .MuiTab-root.Mui-selected": {
                  color: "white",
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: "8px 8px 0 0",
                },
              }}
            >
              <Tab label="Drive" value="/drive" />
              <Tab label="Arm" value="/arm" />
              <Tab label="Science" value="/science" />
              <Tab label="Autonomy" value="/autonomy" />
              <Tab label="Extras" value="/extras" />
            </Tabs>
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
            borderRadius: "12px",
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
            <Tabs
              orientation="vertical"
              // we only track the first path,
              // so truncate /extras/graphs to /extras so it stays highlighted
              value={"/" + location.pathname.split("/")[1]}
              onChange={(e, value) => navigate(value)}
              role="navigation"
              TabIndicatorProps={{
                style: {
                  backgroundColor: "black",
                },
              }}
              sx={{
                borderRight: "3px solid rgba(0,0,0,0.12)",

                "& .MuiTab-root": {
                  color: "black",
                  transition: "all 0.2s ease",
                  minWidth: "unset",
                  padding: "6px 12px",
                  alignItems: "flex-start",
                },

                "& .MuiTab-root.Mui-selected": {
                  color: "black",
                  backgroundColor: "rgba(0,0,0,0.24)",
                  borderRadius: "8px 0 0 8px",
                },
              }}
            >
              <Tab label="Drive" value="/drive" />
              <Tab label="Arm" value="/arm" />
              <Tab label="Science" value="/science" />
              <Tab label="Autonomy" value="/autonomy" />
              <Tab label="Extras" value="/extras" />
            </Tabs>
          </Box>
          <ListItem>
            <Typography sx={{ color: "black" }} variant="h6">
              SPLIT SCREEN
            </Typography>
          </ListItem>
          <ListItem>
            <ToggleButtonGroup
              color="primary"
              value={selectedElements}
              exclusive
              onChange={changeElements}
            >
              <ToggleButton value="ui">UI</ToggleButton>
              <ToggleButton value="both">BOTH</ToggleButton>
              <ToggleButton value="cameras">CAMS</ToggleButton>
            </ToggleButtonGroup>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
