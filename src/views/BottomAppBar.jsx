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
import Metrics from "../components/metrics/metricsPanel";
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
          bgcolor: import.meta.env.MODE === "prod" ? orange[700] : undefined,
          top: 'auto', bottom: 0
        }}
      >
        <Toolbar>

          {/* fill the space between the buttons and the connection status */}
          <div style={{ flexGrow: 1 }} />

          <Metrics openPane={openPane} setOpenPane={setOpenPane} openUp />
          <StateMachine openPane={openPane} setOpenPane={setOpenPane} openUp />

        </Toolbar>
      </AppBar>
    </>
  );
}
