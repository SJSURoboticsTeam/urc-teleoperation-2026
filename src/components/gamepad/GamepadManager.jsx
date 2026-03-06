import { Typography, Box, Button } from "@mui/material";
import { useConnectedGamepads } from "../../contexts/GamepadContext";

// Handles UI for connecting and disconnecting gamepads
export default function GamepadDivNew({ name }) {
  const [connectedGamepads, setConnectedGamepads] = useConnectedGamepads();
  const gpList =
    name === "Drive"
      ? Object.values(connectedGamepads?.driveGPList || {})
      : Object.values(connectedGamepads?.armGPList || {});
  const connectedOne =
    name === "Drive" ? connectedGamepads?.drive : connectedGamepads?.arm;

  return (
    <div style={{ padding: 2, marginTop: 2 }}>
      {gpList.length === 0 ? (
        <Typography sx={{ color: "black" }}>
          No {name === "Drive" ? "Xbox" : "Logitech"} gamepads connected
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
                  name === "Drive"
                    ? {
                        ...prev,
                        drive: prev.drive === gp.index ? null : gp.index,
                      }
                    : { ...prev, arm: prev.arm === gp.index ? null : gp.index },
                );
              }}
            >
              {name === "Drive"
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
    </div>
  );
}