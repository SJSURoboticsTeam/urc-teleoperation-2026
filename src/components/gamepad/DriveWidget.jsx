import "react-resizable/css/styles.css";
import { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { robotsocket } from "../socket.io/socket";
import Button from "@mui/material/Button";
import { FrameRateConstant } from "./FrameRateConstant.js";
import { useRobotSocketStatus } from "../socket.io/socket";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Slider from "@mui/material/Slider";
import { Stack } from "@mui/system";
import Wheel from "../ui/Wheel";
import { TbRocket, TbHourglassLow } from "react-icons/tb";

import { useDriveCommands } from "../../contexts/DriveCommandContext.jsx";
import { useMastCommands } from "../../contexts/MastCommandContext.jsx";
import { useConnectedGamepads } from "../../contexts/GamepadContext.jsx";

const HEADER_HEIGHT = 56;

export default function DriveManualInput({ controlsLocked = false }) {
  // Server connection status
  const serverConnected = useRobotSocketStatus();
  const [txon, settxon] = useState(false);

  // Drive
  const [connectedGamepads] = useConnectedGamepads();
  const driveConnectedOne = connectedGamepads.drive;

  const [driveCommands, setDriveCommands] = useDriveCommands();
  const {
    sidewaysVelocity,
    forwardsVelocity,
    rotationalVelocity,
    moduleConflicts,
    driveSpeed,
  } = driveCommands;

  // Mast
  const {mastCommands, setMastCommands, panAnglesRef} = useMastCommands();
  const { px: panX, py: panY, wheels_x, panSpeed } = mastCommands;

  // refs update whenever mast panning changes
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const wheelsXRef = useRef(wheels_x);

  useEffect(() => {
    panXRef.current = panX;
  }, [panX]);

  useEffect(() => {
    panYRef.current = panY;
  }, [panY]);

  useEffect(() => {
    wheelsXRef.current = wheels_x;
  }, [wheels_x]);

  const driveCommandsRef = useRef(driveCommands);

  useEffect(() => {
    driveCommandsRef.current = driveCommands;
  }, [driveCommands]);

  // If autonomy starts, immediately turn off AUTO TX.
  useEffect(() => {
    if (controlsLocked) {
      settxon(false);
    }
  }, [controlsLocked]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        controlsLocked ||
        !serverConnected ||
        driveConnectedOne == null ||
        !txon
      ) {
        return;
      }

      robotsocket.emit("driveCommands", {
        xVel: driveCommandsRef.current.forwardsVelocity,
        yVel: driveCommandsRef.current.sidewaysVelocity,
        rotVel: driveCommandsRef.current.rotationalVelocity,
        moduleConflicts: Number(driveCommandsRef.current.moduleConflicts),
      });
    }, FrameRateConstant);

    return () => clearInterval(interval);
  }, [controlsLocked, serverConnected, driveConnectedOne, txon]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        controlsLocked ||
        !serverConnected ||
        driveConnectedOne == null ||
        !txon
      ) {
        return;
      }

      robotsocket.emit("mastCommands", {
        xVel: panXRef.current,
        yVel: panYRef.current,
        wheels_x: wheelsXRef.current,
      });
    }, FrameRateConstant);

    return () => clearInterval(interval);
  }, [controlsLocked, serverConnected, driveConnectedOne, txon]);

  const handleHoming = () => {
    if (controlsLocked || !serverConnected) return;

    robotsocket.emit("driveHoming");
  };

    const recenter = () => {
    if (controlsLocked || driveConnectedOne == null) return;

    panAnglesRef.current.px = 0;
    panAnglesRef.current.py = 0;
    panAnglesRef.current.wheelsx = 0;
  };

  const handleManualTx = () => {
    if (controlsLocked || !serverConnected) return;

    console.log("Manual TX");

    robotsocket.emit("driveCommands", {
      xVel: forwardsVelocity,
      yVel: sidewaysVelocity,
      rotVel: rotationalVelocity,
      moduleConflicts: Number(moduleConflicts),
    });

    robotsocket.emit("mastCommands", {
      xVel: panX,
      yVel: panY,
      wheels_x: wheels_x,
    });
  };

  const handleDriveSpeedChange = (_, value) => {
    if (controlsLocked) return;

    setDriveCommands((prev) => ({
      ...prev,
      driveSpeed: value,
    }));
  };

  const handlePanSpeedChange = (_, value) => {
    if (controlsLocked) return;

    setMastCommands((prev) => ({
      ...prev,
      panSpeed: value,
    }));
  };

  const VelocityItem = ({ value, label }) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: 75,
          height: 50,
          border: "2px solid black",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: controlsLocked ? 0.55 : 1,
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
      <Box
        sx={{
          display: "flex",
          gap: 2.5,
          opacity: controlsLocked ? 0.65 : 1,
        }}
      >
        <Box
          sx={{
            border: 1.5,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            p: 1,
            borderColor: "gray",
          }}
        >
          <Box
            sx={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Stack
              spacing={2}
              direction="row"
              sx={{ alignItems: "center", mb: 1 }}
            >
              <TbHourglassLow size="30px" />
              <Slider
                step={0.25}
                marks
                value={driveSpeed}
                onChange={handleDriveSpeedChange}
                min={0.25}
                max={4}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `Drive Speed: ${value}`}
                sx={{ width: 150 }}
                disabled={controlsLocked}
              />
              <TbRocket size="30px" />
            </Stack>
          </Box>

          <Box
            sx={{
              height: 100,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <VelocityItem value={forwardsVelocity.toFixed(1)} label="X Vel" />
            <VelocityItem value={sidewaysVelocity.toFixed(1)} label="Y Vel" />
            <VelocityItem
              value={rotationalVelocity.toFixed(1)}
              label="Rotational"
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={txon}
                  onChange={(e) => settxon(e.target.checked)}
                  disabled={controlsLocked}
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
              onClick={handleManualTx}
              sx={{ whiteSpace: "nowrap" }}
              disabled={controlsLocked || !serverConnected}
            >
              MANUAL TX
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            border: 1.5,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            p: 1,
            borderColor: "gray",
          }}
        >
          <Box
            sx={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Stack
              spacing={2}
              direction="row"
              sx={{ alignItems: "center", mb: 1 }}
            >
              <TbHourglassLow size="30px" />
              <Slider
                step={10}
                marks
                value={panSpeed}
                onChange={handlePanSpeedChange}
                min={10}
                max={100}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `Pan Speed: ${value}`}
                sx={{ width: 150 }}
                disabled={controlsLocked}
              />
              <TbRocket size="30px" />
            </Stack>
          </Box>

          <Box
            sx={{
              height: 100,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <VelocityItem value={panX} label="Mast W" />
            <VelocityItem value={panY} label="Mast H" />
            <VelocityItem value={wheels_x} label="Wheels" />
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Button
              variant="contained"
              onClick={handleHoming}
              sx={{ whiteSpace: "nowrap" }}
              disabled={controlsLocked || !serverConnected}
            >
              Homing
            </Button>
            <Button
              variant="contained"
              onClick={recenter}
              sx={{ whiteSpace: "nowrap" }}
              disabled={controlsLocked || driveConnectedOne == null }
            >
              RECENTER
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            border: 1.5,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            p: "clamp(4px, 0.5vw, 8px)",
            borderColor: "gray",
            opacity: controlsLocked ? 0.55 : 1,
            pointerEvents: controlsLocked ? "none" : "auto",
          }}
        >
          <Wheel />
        </Box>
      </Box>
    </Box>
  );
}
