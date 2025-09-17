import { socket } from "../socket";
import React, { useState } from "react";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';


export default function NavConnectionStatus() {
  
  function connect() {
    socket.connect();
  }

  function disconnect() {
    socket.disconnect();
  }

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
            <Typography  sx={{ color: 'black' }}>{ 'Connected=' + socket.connected }</Typography>
            <TextField id="outlined-basic" label="Server Address" variant="outlined" />
            <ButtonGroup variant="contained" aria-label="Basic button group">
                <Button color="error" onClick={ disconnect } variant="contained">DISCONNECT</Button>
                <Button color="success" onClick={ connect } variant="contained">CONNECT</Button>
            </ButtonGroup>
            
          </div>
        )}
      </div>
  );
}