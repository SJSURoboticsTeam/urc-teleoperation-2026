import { Typography, Box, Button } from "@mui/material";
import { useConnectedGamepads } from "../../contexts/GamepadContext";

// Handles UI for connecting and disconnecting gamepads
export default function GamepadDivNew({ name }) {
  const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();
  gpList =
    name === "Drive"
      ? Object.values(connectedGamepads.driveGPList || {})
      : Object.values(connectedGamepads.armGPList || {});

  return (
    <div style={{ padding: 2, marginTop: 2 }}>
      {gpList.length === 0 && (
        <Typography>
          No {name === "Drive" ? "Xbox" : "Logitech"} gamepads connected
        </Typography>
      )}
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
            sx={{ marginTop: 1 }}
            onClick={() => {
              // Toggle connection for the selected gamepad
              setConnectedGamepads(
                name === "Drive"
                  ? gp.index === connectedGamepads.drive
                    ? null
                    : gp.index
                  : gp.index === connectedGamepads.arm
                    ? null
                    : gp.index,
              );
            }}
          >
            {/* Display Disconnect or Select */}
            {name === "Drive"
              ? connectedGamepads.drive === gp.index
                ? "Disconnect"
                : "Select"
              : connectedGamepads.arm === gp.index
                ? "Disconnect"
                : "Select"}
          </Button>
        </Box>
      ))}
    </div>
  );
}
