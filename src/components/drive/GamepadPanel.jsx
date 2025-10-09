import { useState, useEffect } from "react";
import { Box, Typography, Button, Collapse, Paper } from "@mui/material";

export default function GamepadPanel({ gamepads, onVelocitiesChange, name }) {
  const [connectedOne, setConnectedOne] = useState(null);
  const [velocities, setVelocities] = useState({ lx: 0, ly: 0, rx: 0 });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (connectedOne == null) {
      setVelocities({ lx: 0, ly: 0, rx: 0 });
      onVelocitiesChange?.({ lx: 0, ly: 0, rx: 0 });
      return;
    }
    let animationId;
    const pollAxes = () => {
      const gp = navigator.getGamepads()[connectedOne];
      if (gp) {
        const newVel = {
          lx: gp.axes[0] || 0,
          ly: -(gp.axes[1] || 0),
          rx: gp.axes[2] || 0,
        };
        setVelocities(newVel);
        onVelocitiesChange?.(newVel);
      }
      animationId=requestAnimationFrame(pollAxes);
    };

    pollAxes();

    return () => cancelAnimationFrame(animationId);
  }, [connectedOne, onVelocitiesChange]);

  const gpList = Object.values(gamepads);

  return (
    <Box sx={{ position:'relative', marginRight:5, width: 150}}>
      <Button sx={{maxWidth:'contain', border: 'none', boxShadow:'none'}} variant="contained" onClick={() => setOpen(!open)}>
        Gamepads {open ? "▲" : "▼"}
      </Button>

      <Collapse in={open}>
        <Paper sx={{maxHeight:150,width:400,overflowX:'hidden',overflowY:'auto',left:'50%',transform: 'translateX(-50%)',position:'absolute',top:'100%', zIndex:1300, marginTop: 1, padding: 2}}>
          {gpList.length === 0 && <Typography>No gamepads connected</Typography>}
          {gpList.map((gp) => (
            <Box
              key={gp.index}
              sx={{
                border: "1px solid #ccc",
                borderRadius: 1,
                padding: 1,
                marginBottom: 1,
                backgroundColor: connectedOne === gp.index ? "#e0f7fa" : "#f9f9f9",
              }}
            >
              <Typography variant="subtitle1">Gamepad {gp.index}</Typography>
              <Typography variant="body2">ID: {gp.id}</Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ marginTop: 1, left:'50%',transform: 'translateX(-50%)' }}
                onClick={() =>
                  setConnectedOne(connectedOne == gp.index ? null : gp.index)
                }
              >
                {connectedOne === gp.index ? "Disconnect" : "Select"}
              </Button>
            </Box>
          ))}
        </Paper>
      </Collapse>
    </Box>
  );
}
