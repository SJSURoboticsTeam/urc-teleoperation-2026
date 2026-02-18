import { Typography, Box, Button, ListItem, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";


export default function GamepadDiv({
  gpList,
  connectedOne,
  setConnectedOne,
  name,
  moduleConflicts,
  setModuleConflicts,
  setArmManualDisconnect,
}) {
  return (
    <div style={{ padding: 2, marginTop: 2 }}>
      {name == "Drive" && (
        <div style={{ marginBottom: 5 }}>
            <FormControlLabel
              sx={{ color: 'black' }}
              control={
                <Switch
                  checked={moduleConflicts}
                  onChange={(e) => setModuleConflicts(e.target.checked)}
                />
              }
              label="Module Protection"
            />
        </div>
      )}
      {gpList.length === 0 && (
        <Typography sx={{ color: 'black' }}>
          No {name == "Drive" ? "Xbox" : "Logitech"} gamepads connected
        </Typography>
      )}
      {gpList.map((gp) => (
        <Box
          key={gp.index}
          sx={{
            border: "1px solid #0d0000",
            borderRadius: 1,
            padding: 1,
            marginBottom: 1,
            backgroundColor: connectedOne === gp.index ? "#e0f7fa" : "#f9f9f9",
          }}
        >
          <Typography sx={{ color: 'black' }} variant="subtitle1">Gamepad {gp.index}</Typography>
          <Typography sx={{ color: 'black' }} variant="body2">ID: {gp.id}</Typography>
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
