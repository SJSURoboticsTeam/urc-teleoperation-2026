import "react-resizable/css/styles.css"; // Import default styles
import { useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { socket } from "../socket.io/socket.jsx";
import Button from "@mui/material/Button";
import { FrameRateConstant } from "./FrameRateConstant.js";
import { useSocketStatus } from '../socket.io/socket';
import GamepadPanel from './Gamepad'



export default function DriveManualInput({
  sidewaysVelocity,
  forwardsVelocity,
  rotationalVelocity,
  moduleConflicts,
  panHeightVelocity,
  panWidthVelocity,
}) {
 
  const serverConnected = useSocketStatus()

  // Sends drive commands to server at the frame rate constant
  useEffect(() => {
    const interval = setInterval(() => {
      let driveCommands = {
        xVel: sidewaysVelocity,
        yVel: forwardsVelocity,
        rotVel: rotationalVelocity,
        moduleConflicts: Number(moduleConflicts),
      };
      if(serverConnected && (GamepadPanel.drive)) {
      socket.emit("driveCommands", driveCommands);
      }
    }, FrameRateConstant)

    return () => clearInterval(interval);
  }, [sidewaysVelocity, forwardsVelocity, rotationalVelocity, moduleConflicts, serverConnected]);


  useEffect(() => {
    let panCommands = {
      xVel: panHeightVelocity,
      yVel: panWidthVelocity,
    };
    if(serverConnected && (true)) {
    socket.emit("panCommands", panCommands);
    }
  }, [panHeightVelocity, panWidthVelocity, serverConnected]);

  const handleClick = (event) => {
    socket.emit("driveHoming");
  };

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
