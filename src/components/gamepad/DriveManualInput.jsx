import "react-resizable/css/styles.css"; // Import default styles
import { useEffect } from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { socket } from "../../socket.jsx";
import Button from "@mui/material/Button";
import { FrameRateConstant } from "./FrameRateConstant.js";
export default function DriveManualInput({
  sidewaysVelocity,
  forwardsVelocity,
  rotationalVelocity,
  moduleConflicts,
  panHeightVelocity,
  panWidthVelocity,
}) {
  // Sends drive commands to server
  // constant + whenever it changes, emit
  setInterval(() => {
    let driveCommands = {
      xVel: sidewaysVelocity,
      yVel: forwardsVelocity,
      rotVel: rotationalVelocity,
      moduleConflicts: Number(moduleConflicts),
    };
    socket.emit("driveCommands", driveCommands);
  }, FrameRateConstant);

  useEffect(() => {
    let panCommands = {
      xVel: panHeightVelocity,
      yVel: panWidthVelocity,
    };
    socket.emit("panCommands", panCommands);
  }, [panHeightVelocity, panWidthVelocity]);

  const handleClick = (event) => {
    socket.emit("driveHoming");
  };

  const velocities = [
    { id: sidewaysVelocity, name: "X Vel" },
    { id: forwardsVelocity, name: "Y Vel" },
    { id: rotationalVelocity, name: "Rotational" },
    { id: panWidthVelocity, name: "Pan W" },
    { id: panHeightVelocity, name: "Pan H" },
  ];
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Button
        onClick={handleClick}
        variant="contained"
        sx={{
          backgroundColor: "#1976d2",
          color: "#fff",
          "&:hover": { backgroundColor: "#115293" },
        }}
      >
        Homing
      </Button>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          height: 100,
          marginBottom: 5,
          marginTop: 2,
        }}
      >
        {velocities.map((velocity) => (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              alignItems: "center",
              border: "2px solid #000000",
              width: "75px",
              height: "50px",
              borderRadius: 2,
              marginTop: 5,
              marginBottom: 10,
            }}
          >
            <Typography variant="body1" sx={{ marginTop: 6 }}>
              {velocity.id}
            </Typography>
            <Typography variant="body2" sx={{ marginTop: 3 }}>
              {velocity.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
