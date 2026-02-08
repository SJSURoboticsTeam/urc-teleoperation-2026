import "react-resizable/css/styles.css";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { socket } from "../socket.io/socket.jsx";
import Button from "@mui/material/Button";
import { FrameRateConstant } from "./FrameRateConstant.js";
import { useSocketStatus } from "../socket.io/socket";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Slider from "@mui/material/Slider";

const HEADER_HEIGHT = 56;

export default function DriveManualInput({
  sidewaysVelocity,
  forwardsVelocity,
  rotationalVelocity,
  moduleConflicts,
  panHeightVelocity,
  panWidthVelocity,
  setDriveConnectedOne,
  driveConnectedOne,
}) {
  const serverConnected = useSocketStatus();
  const [txon, settxon] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!serverConnected || driveConnectedOne == null || !txon) return;

      socket.emit("driveCommands", {
        xVel: sidewaysVelocity,
        yVel: forwardsVelocity,
        rotVel: rotationalVelocity,
        moduleConflicts: Number(moduleConflicts),
      });
    }, FrameRateConstant);

    return () => clearInterval(interval);
  }, [
    sidewaysVelocity,
    forwardsVelocity,
    rotationalVelocity,
    moduleConflicts,
    serverConnected,
    driveConnectedOne,
    txon,
  ]);

  useEffect(() => {
    if (!serverConnected || driveConnectedOne == null || !txon) return;

    socket.emit("panCommands", {
      xVel: panHeightVelocity,
      yVel: panWidthVelocity,
    });
  }, [
    panHeightVelocity,
    panWidthVelocity,
    serverConnected,
    driveConnectedOne,
    txon,
  ]);

  const handleHoming = () => socket.emit("driveHoming");

  const handleManualTx = () => {
    socket.emit("driveCommands", {
      xVel: sidewaysVelocity,
      yVel: forwardsVelocity,
      rotVel: rotationalVelocity,
      moduleConflicts: Number(moduleConflicts),
    });

    socket.emit("panCommands", {
      xVel: panHeightVelocity,
      yVel: panWidthVelocity,
    });
  };

  const VelocityItem = ({ value, label }) => (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box
        sx={{
          width: 75,
          height: 50,
          border: "2px solid black",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body1">{value}</Typography>
      </Box>
      <Typography variant="body2" sx={{ marginTop: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box sx={{ display: "flex", gap: 3 }}>
        {/* LEFT COLUMN */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {/* HEADER */}
          <Box
            sx={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={txon}
                  onChange={(e) => settxon(e.target.checked)}
                />
              }
              label="AUTO TX"
              componentsProps={{
                typography: {
                  sx: { whiteSpace: "nowrap" },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleHoming}
              sx={{ whiteSpace: "nowrap" }}
            >
              Homing
            </Button>
            <Button
              variant="contained"
              onClick={handleManualTx}
              sx={{ whiteSpace: "nowrap" }}
            >
              MANUAL TX
            </Button>
          </Box>

          {/* CONTENT */}
          <Box
            sx={{
              height: 120,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <VelocityItem value={forwardsVelocity} label="X Vel" />
            <VelocityItem value={sidewaysVelocity} label="Y Vel" />
            <VelocityItem value={rotationalVelocity} label="Rotational" />
          </Box>
        </Box>

        {/* RIGHT COLUMN */}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {/* HEADER */}
          <Box
            sx={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Slider 
            step={1}
            marks
            min={1}
            max={8}
            valueLabelDisplay="auto"
            sx={{ width: 150 }} />
          </Box>

          {/* CONTENT */}
          <Box
            sx={{
              height: 120,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <VelocityItem value={panWidthVelocity} label="Pan W" />
            <VelocityItem value={panHeightVelocity} label="Pan H" />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}