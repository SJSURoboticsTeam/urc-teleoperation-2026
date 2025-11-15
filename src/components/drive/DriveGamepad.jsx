import { Typography, Box, Button } from "@mui/material";
import { useState } from "react";
export default function GamepadDiv({
  gpList,
  connectedOne,
  setConnectedOne,
  name,
  setModuleConflicts,
  setArmManualDisconnect,
}) {
  const [current, setCurrent] = useState("Module Conflicts: OFF");
  return (
    <div style={{ padding: 2, marginTop: 2 }}>
      {name == "Drive" && (
        <div style={{ marginBottom: 5 }}>
          <button
            onClick={() => {
              setModuleConflicts((prev) => !prev);
              current.includes("OFF")
                ? setCurrent("Module Conflicts: ON")
                : setCurrent("Module Conflicts: OFF");
            }}
          >
            {current}
          </button>
        </div>
      )}
      {gpList.length === 0 && (
        <Typography>
          No {name == "Drive" ? "Xbox" : "Logitech"} gamepads connected
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
              setConnectedOne(connectedOne == gp.index ? null : gp.index);
              if (connectedOne == gp.index) {
                setArmManualDisconnect((prev) => !prev);
              }
            }}
          >
            {connectedOne === gp.index ? "Disconnect" : "Select"}
          </Button>
        </Box>
      ))}
    </div>
  );
}
