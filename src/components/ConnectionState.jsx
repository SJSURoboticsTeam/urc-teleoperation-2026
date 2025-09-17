import React, { useState } from "react";
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import TextField from '@mui/material/TextField';
import { Typography } from "@mui/material";
export function ConnectionState({ isConnected }) {
    return (
        <p>State: { '' + isConnected }</p>
    )
}
export default function NavConnectionStatus() {
  const [open, setOpen] = useState(false);

  return (
      <div style
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{ position: "relative" }}
      >
        <span style={{ cursor: "pointer" }}> SERVER: CONNECTED</span>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              background: "white",
              border: "1px solid gray",
              padding: "10px",
            }}
          >
            <Typography variant="h6" sx={{ color: 'black' }}>Server info</Typography>
            <Typography  sx={{ color: 'black' }}>Latency: 33ms</Typography>
            <TextField id="outlined-basic" label="Server Address" variant="outlined" />
            <ButtonGroup variant="contained" aria-label="Basic button group">
                <Button color="error" variant="contained">DISCONNECT</Button>
                <Button color="success" variant="contained">CONNECT</Button>
            </ButtonGroup>
            
          </div>
        )}
      </div>
  );
}
