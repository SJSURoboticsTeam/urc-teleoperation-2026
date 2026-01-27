import "react-resizable/css/styles.css"; // Import default styles
import { useEffect, useRef } from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { socket } from "../socket.io/socket.jsx";
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

  // const prevDriveCommandsRef = useRef(null);
  // Sends drive commands to server at the frame rate constant
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     let driveCommands = {
  //       xVel: sidewaysVelocity,
  //       yVel: forwardsVelocity,
  //       rotVel: rotationalVelocity,
  //       moduleConflicts: Number(moduleConflicts),
  //     };
  //     // console.log("in interval")
  //     // console.log(prevDriveCommandsRef.current)
  //     // console.log(driveCommands)
  //     // // Only emit if the values change
  //     // if (JSON.stringify(prevDriveCommandsRef.current) !== JSON.stringify(driveCommands)) {
  //     //   console.log("emitting")
  //     //   socket.emit("driveCommands", driveCommands);
  //     //   prevDriveCommandsRef.current = driveCommands;
  //     // }
  //     socket.emit("driveCommands", driveCommands);
  //   }, FrameRateConstant)

  //   return () => clearInterval(interval);
  // }, [sidewaysVelocity, forwardsVelocity, rotationalVelocity, moduleConflicts]);


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

  const handleManualClick = (event) => {
    let driveCommands = {
        xVel: sidewaysVelocity,
        yVel: forwardsVelocity,
        rotVel: rotationalVelocity,
        moduleConflicts: Number(moduleConflicts),
      };
      socket.emit("driveCommands", driveCommands);
  }

  const velocities = [
    { id: forwardsVelocity, name: "X Vel" },
    { id: sidewaysVelocity, name: "Y Vel" },
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
      <Button
        onClick={handleManualClick}
        variant="contained"
        sx={{
          backgroundColor: "#1976d2",
          color: "#fff",
          "&:hover": { backgroundColor: "#115293" },
        }}
      >
        Manual
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
