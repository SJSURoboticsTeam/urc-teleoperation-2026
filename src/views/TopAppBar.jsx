import { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  Tooltip,
  Box,
  Tabs,
  Tab,
} from "@mui/material";
import ExpandIcon from "@mui/icons-material/Expand";
import MenuIcon from "@mui/icons-material/Menu";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { orange } from "@mui/material/colors";
import NavConnectionStatus from "../components/socket.io/BackendConnectionManager";
import GamepadPanel from "../components/gamepad/Gamepad";
import MenuPane from "../components/ui/MenuPane";

import { robotsocket } from "../components/socket.io/socket";
import { useConnectionStatus } from "../contexts/ConnectionContext";
import { useSoftStop } from "../contexts/SoftStopContext";

import { useNavigate } from "react-router-dom";

// Views shown in both the top bar tabs and the side drawer tabs
const VIEW_TABS = [
  { label: "Drive", value: "/drive" },
  { label: "Arm", value: "/arm" },
  { label: "Science", value: "/science" },
  { label: "Autonomy", value: "/autonomy" },
  { label: "Graphs", value: "/graphs" },
  { label: "Extras", value: "/extras" },
];

export default function TopAppBar({
  selectedElements,
  setSelectedElements,
  showbottbar,
  setshowbottbar,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openPane, setOpenPane] = useState("None");

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const navigate = useNavigate();

  const [capsLockActive, setCapsLockState] = useState(false);
  const [estopStatus, setestopStatus] = useState("STANDBY"); //STANDBY, LOADING, KILLED

// Use shared robot connection state to control E-STOP availability
  const { robotConnected: isRobotConnected } = useConnectionStatus();

  const { softStopActive } = useSoftStop();
  const [softStopLoading, setSoftStopLoading] = useState(false);

  // softStopActive itself updates from the server's "softStopChanged"
  // broadcast (see SoftStopProvider), not from this client's own ack -
  // that way every connected client stays in sync, not just the one
  // that clicked the button.
  function triggerSoftStop() {
    setSoftStopLoading(true);
    robotsocket.emit("softStop", () => {
      setSoftStopLoading(false);
    });
  }

  function resumeControls() {
    setSoftStopLoading(true);
    robotsocket.emit("resumeControls", () => {
      setSoftStopLoading(false);
    });
  }

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
          bgcolor: import.meta.env.MODE === "prod" ? orange[700] : undefined,
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
              // first truncate out base URL
              // To prevent MUI console warning pretend it's on drive before / redirect
              // then truncate path for matchability, (/extras/graphs to /extras)
              // THERE'S ANOTHER VALUE IN FILE FOR THE SIDE PANE!!!
              value={
                "/" +
                (location.pathname
                  .replace(import.meta.env.BASE_URL, "")
                  .split("/")
                  .filter(Boolean)[0] || "drive")
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
              {VIEW_TABS.map(({ label, value }) => (
                <Tab key={value} label={label} value={value} />
              ))}
            </Tabs>
          </Box>

          {/* fill the space between the buttons and the connection status */}
          <div style={{ flexGrow: 1 }} />
          <Button
            sx={{
              mr: 2,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            variant="contained"
            color={softStopActive ? "success" : "warning"}
            loading={softStopLoading}
            disabled={!isRobotConnected}
            onClick={softStopActive ? resumeControls : triggerSoftStop}
          >
            {softStopActive ? "RESUME" : "SOFT STOP"}
          </Button>
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

          <IconButton
            edge="end"
            color="inherit"
            aria-label="Toggle bottom bar"
            style={{ marginRight: 0 }}
            onClick={() => {
              setshowbottbar(!showbottbar);
            }}
          >
            <ExpandIcon />
          </IconButton>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="Fullscreen"
            style={{ marginRight: 0, marginLeft:0 }}
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
      {MenuPane(drawerOpen, toggleDrawer, navigate, selectedElements, changeElements, VIEW_TABS)}
    </>
  );
}




