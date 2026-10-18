import { useState } from "react";
import {
  AppBar,
  Toolbar,
} from "@mui/material";
import { orange } from "@mui/material/colors";
import AntennaRotation from "../components/antenna/antennarotation";
import Metrics from "../components/metrics/metricsPanel";
import StateMachine from "../components/statemachine/statemachine";
import BatteryDisplay from "../components/battery/batteryDisplay";
import CameraManager from "../components/cameras/CameraManager"
import Clock from "../components/clock/clock";
import { useConnectionStatus } from "../contexts/ConnectionContext";

export default function TopAppBar({showbottbar }) {
  const [openPane, setOpenPane] = useState("None");
  const { robotConnected: isRobotConnected } = useConnectionStatus();

  return (
    showbottbar? (
      <AppBar
        sx={{
          bgcolor: import.meta.env.MODE === "prod" ? orange[700] : undefined,
          top: 'auto', bottom: 0
        }}
      >
        <Toolbar>
          <BatteryDisplay/>
          <Clock openPane={openPane} setOpenPane={setOpenPane} openUp/>

          {/* fill the space between the buttons and the connection status */}
          <div style={{ flexGrow: 1 }} />
          <CameraManager openPane={openPane} setOpenPane={setOpenPane} openUp/>
          <AntennaRotation openPane={openPane} setOpenPane={setOpenPane} openUp/> 
          <Metrics openPane={openPane} setOpenPane={setOpenPane} openUp />
          <StateMachine openPane={openPane} setOpenPane={setOpenPane} isRobotConnected={isRobotConnected} openUp />
        </Toolbar>
      </AppBar>
    ):null
  );
}
