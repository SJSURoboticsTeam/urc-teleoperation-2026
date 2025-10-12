import "react-resizable/css/styles.css"; // Import default styles
import { useEffect } from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { socket } from "../../socket";
import Button from "@mui/material/Button";
export default function DriveManualInput({ sidewaysVelocity, forwardsVelocity, rotationalVelocity, panHeightVelocity, panWidthVelocity }) {
  // Sends drive commands to server
  useEffect(() => {
    let driveCommands = {
      xVel: sidewaysVelocity,
      yVel: forwardsVelocity,
      rotVel: rotationalVelocity,

    };
    socket.emit("driveCommands", driveCommands);
  }, [sidewaysVelocity, forwardsVelocity, rotationalVelocity]);

  const handleClick = (event) => {
    socket.emit("driveHoming");
  };
  const velocities = [
    { id: sidewaysVelocity, name: "Sideways Velocity" },
    { id: forwardsVelocity, name: "Forward Velocity" },
    { id: rotationalVelocity, name: "Rotational Velocity" },
    { id: panHeightVelocity, name: "Pan Height Velocity"},
    { id: panWidthVelocity, name: "Pan Width Velocity"}
  ];
  return (
    <Box sx={{display:'flex',flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
      <Button onClick={handleClick}>Homing</Button>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          height: 100,
          marginBottom:5,
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
              marginBottom:10
            }}
          >
            <Typography variant="body1" sx={{ marginTop: 10 }}>
              ={velocity.id}
            </Typography>
            <Typography variant="body2" sx={{ marginTop: 5 }}>
              {velocity.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
