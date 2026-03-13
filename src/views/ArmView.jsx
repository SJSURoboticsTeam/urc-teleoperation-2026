import { green } from "@mui/material/colors";
import { useState, useRef, useEffect } from "react";
import "react-resizable/css/styles.css";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { Typography, Box, Slider, Grid, Button } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { FrameRateConstant } from "../components/gamepad/FrameRateConstant";
import { useSocketStatus, socket } from "../components/socket.io/socket";
import { useArmCommands } from "../contexts/ArmCommandContext";
import { useConnectedGamepads } from "../contexts/GamepadContext";

// View for arm controls, handles both manual slider input and gamepad input (if connected)
export default function ArmView({}) {
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads] = useConnectedGamepads();
  const armConnectedOne = connectedGamepads.arm;
  const serverConnected = useSocketStatus();
  const [txon, settxon] = useState(false);

  const armCommandsRef = useRef(armCommands);
  useEffect(() => {
    armCommandsRef.current = armCommands;
  }, [armCommands]);

  // Continuously transmit arm commands
  useEffect(() => {
    if (!serverConnected || armConnectedOne == null || !txon) return;
    console.log("Starting arm command transmission");
    const intervalId = setInterval(() => {
      socket.emit("armCommands", armCommandsRef.current);
    }, FrameRateConstant);

    return () => clearInterval(intervalId);
  }, [serverConnected, armConnectedOne, txon]);

  // Test transmission manually
  const handleManualUpdate = () => {
    if (!serverConnected) return;
    socket.emit("armCommands", armCommands);
    // console.log("Manual arm commands sent:", JSON.stringify(armCommands));
  };

  // When sliders are used, update armCommands state
  const handleSliderChange = (key, value) => {
    setArmCommands((prev) => ({
      ...prev,
      [key]: Number(value),
    }));
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* If arm controller is not connected, use sliders -- else use controllers */}
      {armConnectedOne == null ? (
        <>
          <Box sx={{ mt: 4 }}>
            <Typography sx={{ textAlign: "center", mb: 2 }} variant="h5">
              Manual Controls
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1, maxWidth: 500 }}>
              {[
                { label: "Elbow", key: "elbow", max: 90 },
                { label: "Shoulder", key: "shoulder", max: 110 },
                { label: "Track (cm)", key: "track", max: 45 },
                { label: "Pitch", key: "pitch", max: 150 },
                { label: "Roll", key: "roll", max: 360 },
                { label: "Clamp (cm)", key: "clamp", max: 20 },
              ].map(({ label, key, max }) => (
                <Grid
                  key={label}
                  sx={{
                    border: "1px solid #ccc",
                    borderRadius: 2,
                    padding: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <Typography gutterBottom>{label}</Typography>
                  <Slider
                    value={armCommands[key] || 0}
                    onChange={(_, v) => handleSliderChange(key, v)}
                    min={0}
                    max={max}
                    step={1}
                    sx={{ width: 200 }}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="body2">
                    {armCommands[key] || 0}
                  </Typography>
                </Grid>
              ))}
            </Grid>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 4,
                mt: 3,
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
              />

              <Button
                variant="contained"
                onClick={handleManualUpdate}
                disabled={!serverConnected}
              >
                Manual TX
              </Button>
            </Box>
          </Box>
        </>
      ) : (
        <Box sx={{ mt: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 2,
            }}
          >
            <SportsEsportsIcon sx={{ color: green[500], fontSize: 60 }} />
          </Box>
          <Grid container spacing={2} sx={{ mt: 1, maxWidth: 500 }}>
            {[
              { label: "Elbow", key: "elbow" },
              { label: "Shoulder", key: "shoulder" },
              { label: "Track", key: "track" },
              { label: "Pitch", key: "pitch" },
              { label: "Roll", key: "roll" },
              { label: "Clamp", key: "clamp" },
            ].map(({ label, key }) => (
              <Grid
                key={label}
                sx={{
                  textAlign: "center",
                  border: "1px solid #ccc",
                  borderRadius: 2,
                  padding: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Typography
                  gutterBottom
                  sx={{ textTransform: "capitalize", width: 200 }}
                >
                  {label}
                </Typography>
                <Typography variant="h6">
                  {Math.round((armCommands[key] || 0) * 100) / 100}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
