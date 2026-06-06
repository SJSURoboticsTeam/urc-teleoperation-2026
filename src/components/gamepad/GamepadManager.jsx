import {
  Typography,
  Box,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EjectIcon from "@mui/icons-material/Eject";
import { useState } from "react";
import { useConnectedGamepads } from "../../contexts/GamepadContext";
import { useDriveCommands } from "../../contexts/DriveCommandContext";
import useArmMimicSerial from "../../hooks/useArmMimicSerial";

const ARM_MIMIC_INDEX = "arm-mimic";

// Handles UI for connecting and disconnecting gamepads
export default function GamepadDiv({ name }) {
  const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();

  const [driveCommands, setDriveCommands] = useDriveCommands();
  const moduleConflicts = driveCommands.moduleConflicts;

  const [selectedArmMimic, setSelectedArmMimic] = useState("disconnect");
  const mimicAvailable = selectedArmMimic === "mimic";

  const { isSupported, isConnected, connect, disconnect } = useArmMimicSerial({
    onLine: (line) => {
      console.log("Received from Arm Mimic:", line);
    },
  });

  const gpList =
    name === "/drive"
      ? Object.values(connectedGamepads?.driveGPList || {})
      : Object.values(connectedGamepads?.armGPList || {});

  const connectedOne =
    name === "/drive" ? connectedGamepads?.drive : connectedGamepads?.arm;

  const handlePhysicalGamepadSelect = (gp) => {
    setConnectedGamepads((prev) =>
      name === "Drive"
        ? {
            ...prev,
            drive: prev.drive === gp.index ? null : gp.index,
          }
        : {
            ...prev,
            arm: prev.arm === gp.index ? null : gp.index,
          },
    );
  };

  const handleArmMimicConnect = async () => {
    if (isConnected) {
      await disconnect();

      setConnectedGamepads((prev) => ({
        ...prev,
        arm: prev.arm === ARM_MIMIC_INDEX ? null : prev.arm,
      }));

      setSelectedArmMimic("disconnect");
      return;
    }

    const connected = await connect();

    if (connected) {
      setConnectedGamepads((prev) => ({
        ...prev,
        arm: ARM_MIMIC_INDEX,
      }));
    }
  };

  return (
    <div style={{ padding: 2, marginTop: 2 }}>
      {name == "/drive" && (
        <div style={{ marginBottom: 5 }}>
          <FormControlLabel
            sx={{ color: "black" }}
            control={
              <Switch
                checked={moduleConflicts}
                onChange={(e) =>
                  setDriveCommands((prev) => ({
                    ...prev,
                    moduleConflicts: e.target.checked,
                  }))
                }
              />
            }
            label="Autofix Overrotation"
          />
        </div>
      )}
      {gpList.length === 0 ? (
        <Typography sx={{ color: "black" }}>
          No {name === "/drive" ? "Xbox/Playstation" : "Logitech Extreme"}{" "}
          gamepads connected.
        </Typography>
      ) : (
        gpList.map((gp) => (
          <Box
            key={gp.index}
            sx={{
              border: "1px solid #0d0000",
              borderRadius: 1,
              padding: 1,
              marginBottom: 1,
              backgroundColor:
                connectedOne === gp.index ? "#e0f7fa" : "#f9f9f9",
            }}
          >
            <Typography sx={{ color: "black" }} variant="subtitle1">
              Gamepad {gp.index}
            </Typography>

            <Typography sx={{ color: "black" }} variant="body2">
              ID: {gp.id}
            </Typography>

            <Button
              variant="outlined"
              size="small"
              sx={{ marginTop: 1 }}
              onClick={() => {
                setConnectedGamepads((prev) =>
                  name === "/drive"
                    ? {
                        ...prev,
                        drive: prev.drive === gp.index ? null : gp.index,
                      }
                    : { ...prev, arm: prev.arm === gp.index ? null : gp.index },
                );
              }}
            >
              {name === "/drive"
                ? connectedGamepads.drive === gp.index
                  ? "Disconnect"
                  : "Select"
                : connectedGamepads.arm === gp.index
                  ? "Disconnect"
                  : "Select"}
            </Button>
          </Box>
        ))
      )}

      {name === "Arm" && (
        <div>
          <hr className="border-t border-gray-300 my-4" />

          <Typography sx={{ color: "black", mt: -1 }} variant="subtitle1">
            ARM MIMIC
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
            <FormControl sx={{ flex: 1 }} size="small">
              <InputLabel id="arm-mimic-select-label">MIMIC</InputLabel>
              <Select
                labelId="arm-mimic-select-label"
                value={isConnected ? "mimic" : "disconnect"}
                label="MIMIC"
                disabled
                fullWidth
              >
                <MenuItem value="disconnect">Disconnect</MenuItem>
                <MenuItem value="mimic">Mimic</MenuItem>
              </Select>
            </FormControl>

            <Button
              color={isConnected ? "error" : "success"}
              variant="contained"
              disabled={!isSupported}
              onClick={handleArmMimicConnect}
              sx={{ width: 50, minWidth: 0 }}
            >
              {isConnected ? <EjectIcon /> : <ElectricalServicesIcon />}
            </Button>
          </Box>
        </div>
      )}
    </div>
  );
}