import { green } from "@mui/material/colors";
import { useState, useRef, useEffect } from "react";
import "react-resizable/css/styles.css";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { Typography, Box, Slider, Grid, Button } from "@mui/material";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { FrameRateConstant } from "../components/gamepad/FrameRateConstant";
import { useRobotSocketStatus, robotsocket } from "../components/socket.io/socket";
import { useArmCommands } from "../contexts/ArmCommandContext";
import { useConnectedGamepads } from "../contexts/GamepadContext";

// View for arm controls, handles both manual slider input and gamepad input (if connected)
export default function ArmView({}) {
  const [armCommands, setArmCommands] = useArmCommands();
  const [connectedGamepads] = useConnectedGamepads();
  const armConnectedOne = connectedGamepads.arm;
  const serverConnected = useRobotSocketStatus();
  const [txon, settxon] = useState(false);

  const armCommandsRef = useRef(armCommands);
  useEffect(() => {
    armCommandsRef.current = armCommands;
  }, [armCommands]);

  // When no arm gamepad is selected, initialize manual controls to
  // their default test ranges so the sliders and displayed values match
  useEffect(() => {
    if (armConnectedOne == null) {
      setArmCommands({
        elbow: -100,
        shoulder: -20,
        track: 0,
        pitch: 0,
        roll: 0,
        clamp: 0,
      });
    }
  }, [armConnectedOne, setArmCommands]);

  const ARM_JOINT_KEYS = ["track", "shoulder", "elbow", "pitch", "roll", "clamp"];
  const prevArmCommandsRef = useRef(armCommands);

  useEffect(() => {
    prevArmCommandsRef.current = armCommands;
  }, []);

  // AUTO TX: emit only joints whose values changed since the last interval
  // This works for both slider mode and gamepad mode
  useEffect(() => {
    if (!serverConnected || !txon) return;

    console.log("[ARM] Starting auto TX (changed joints only)");

    const intervalId = setInterval(() => {
      const current = armCommandsRef.current;
      const previous = prevArmCommandsRef.current;

      ARM_JOINT_KEYS.forEach((joint) => {
        if (current[joint] !== previous[joint]) {
          robotsocket.emit("armJointCommand", { 
            joint,
            value: current[joint],
          });
        }
      });

      prevArmCommandsRef.current = { ...current };
    }, FrameRateConstant);

    return () => clearInterval(intervalId);
  }, [serverConnected, txon]);

  // Manual TX sends the full arm state in one payload
  const handleManualUpdate = () => {
    if (!serverConnected) return;
    robotsocket.emit("armCommands", armCommands);
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
                { label: "Elbow (deg)", key: "elbow", min: -100, max: -20 },
                { label: "Shoulder (deg)", key: "shoulder", min: -20, max: 90 },
                { label: "Track (mm)", key: "track", min: 0, max: 300 },
                { label: "Pitch (deg)", key: "pitch", min: 0, max: 180 },
                { label: "Roll (deg)", key: "roll", min: 0, max: 360 },
                { label: "Clamp", key: "clamp", min: 0, max: 20 },
              ].map(({ label, key, min = 0, max }) => (
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
                    value={armCommands[key] ?? min}
                    onChange={(_, v) => handleSliderChange(key, v)}
                    min={min}
                    max={max}
                    step={1}
                    sx={{ width: 200 }}
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="body2">
                    {armCommands[key] ?? min}
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
                  {Math.round((armCommands[key] ?? 0) * 100) / 100}
                </Typography>
              </Grid>
            ))}
          </Grid>
          <FormControlLabel
            control={
              <Switch
                checked={txon}
                onChange={(e) => settxon(e.target.checked)}
              />
            }
            label="AUTO TX"
          />
        </Box>
      )}
    </Box>
  );
}
