import { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";

export default function Gamepad({onVelocitiesChange}) {
  const [gamepads, setGamepads] = useState([]);
  const [connectedOne, setConnectedOne] = useState(null);
  const [velocities, setVelocities] = useState({ vx: 0, vy: 0, vz: 0 });

  useEffect(() => {
    const updateGamepads = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const gpList = [];
      for (const gp of gps) {
        if (!gp) continue;
        const regex = new RegExp("standard", "i");
        if (regex.test(gp.id)) {
          gpList.push({
            index: gp.index,
            id: gp.id,
          });
        }
      }
      setGamepads(gpList);
      if (connectedOne !== null && !gps[connectedOne]) {
        setConnectedOne(null);
        setVelocities({ vx: 0, vy: 0, vz: 0 });
      }
      requestAnimationFrame(updateGamepads);
    };

    updateGamepads();
  }, [connectedOne]);

  useEffect(() => {
    if (connectedOne == null) return;
    const pollAxes = () => {
      const gp = navigator.getGamepads()[connectedOne];
      if (gp) {
        const newVel = {
          lx: gp.axes[0] || 0,
          ly: -gp.axes[1] || 0,
          rx: gp.axes[2] || 0,
        };
        setVelocities(newVel);
        if (onVelocitiesChange) {
          onVelocitiesChange(newVel);
        }
      }
      requestAnimationFrame(pollAxes);
    };
    pollAxes();
  }, [connectedOne,onVelocitiesChange]);

  return (
    <Box>
      <Typography variant="h5" sx={{ marginBottom: 2 }}>
        Connected Gamepads
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {gamepads.length === 0 && (
          <Typography>No gamepads connected</Typography>
        )}
        {gamepads.map((gp) => (
          <Box
            key={gp.index}
            sx={{
              border: "1px solid #ccc",
              borderRadius: 2,
              padding: 2,
              backgroundColor:
                connectedOne === gp.index ? "#e0f7fa" : "#f9f9f9",
            }}
          >
            <Typography variant="subtitle1">
              Gamepad {gp.index}
            </Typography>
            <Typography variant="body2">ID: {gp.id}</Typography>

            <Button
              variant="outlined"
              size="small"
              sx={{ marginTop: 1 }}
              onClick={() => setConnectedOne(gp.index)}
            >
              {connectedOne === gp.index ? "Selected" : "Select"}
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
