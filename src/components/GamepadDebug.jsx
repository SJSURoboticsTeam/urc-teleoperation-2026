import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";

export default function GamepadDebug() {
  const [gamepadAxes, setGamepadAxes] = useState([]);

  useEffect(() => {
    const updateGamepads = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const axesData = [];

      for (const gp of gps) {
        if (!gp) continue;
        axesData.push({
          index: gp.index,
          leftStick: { x: gp.axes[0], y: gp.axes[1] },
          rightStick: { x: gp.axes[2], y: gp.axes[3] },
        });
        console.log(gp)
      }

      setGamepadAxes(axesData);
      requestAnimationFrame(updateGamepads);
    };

    updateGamepads();
  }, []);

  return (
    <section>
      <Typography variant="h5" sx={{ marginBottom: 2 }}>
        Connected Gamepads
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {gamepadAxes.length === 0 && (
          <Typography>No gamepads connected</Typography>
        )}

        {gamepadAxes.map((gp) => (
          <Box
            key={gp.index}
            sx={{
              border: "1px solid #ccc",
              borderRadius: 2,
              padding: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              backgroundColor: "#f9f9f9",
            }}
          >
            <Typography variant="subtitle1">
              Gamepad {gp.index}
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box>
                <Typography variant="body2">Left Stick</Typography>
                <Typography variant="body1">
                  X: {gp.leftStick.x.toFixed(2)}, Y: {gp.leftStick.y.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2">Right Stick</Typography>
                <Typography variant="body1">
                  X: {gp.rightStick.x.toFixed(2)}, Y: {gp.rightStick.y.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </section>
  );
}
