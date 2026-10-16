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
import { orange } from "@mui/material/colors";
import AntennaRotation from "../components/antenna/antennarotation";
import Metrics from "../components/metrics/metricsPanel";
import StateMachine from "../components/statemachine/statemachine";

export default function TopAppBar({ selectedElements, setSelectedElements,showbottbar, setshowbottbar }) {
  const [openPane, setOpenPane] = useState("None");

  return (
    showbottbar? (
      <AppBar
        sx={{
          bgcolor: import.meta.env.MODE === "prod" ? orange[700] : undefined,
          top: 'auto', bottom: 0
        }}
      >
        <Toolbar>
          11:59PM - 42m left

          {/* fill the space between the buttons and the connection status */}
          <div style={{ flexGrow: 1 }} />
          <AntennaRotation openPane={openPane} setOpenPane={setOpenPane} openUp/> 
          <Metrics openPane={openPane} setOpenPane={setOpenPane} openUp />
          <StateMachine openPane={openPane} setOpenPane={setOpenPane} openUp />
          

        </Toolbar>
      </AppBar>
    ):null
  );
}
