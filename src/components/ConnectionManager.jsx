import { socket } from "../socket";
import React, { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';


export default function NavConnectionStatus() {
  
    const [isConnected, setIsConnected] = useState(socket.connected)
    const [latency, setLatency] = useState(null);
    const [numConnections, setNumConnections] = useState(0);
  
    // Handles connection to socket.io server
    useEffect(() => {
      function onConnect() {
        setIsConnected(true);
      }
  
      function onDisconnect() {
      setIsConnected(false);
  }
  
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect);
  
      return () => {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect);
      }
    }, [])
  
  function connect() {
    socket.connect();
  }

  function disconnect() {
    socket.disconnect();
  }
  function ConnectionDetails() {
    if (isConnected) {
      return "CONNECTED";
    } else {  
      return "DISCONNECTED";
    }
  }

useEffect(() => {
  let interval;
  // send a ping to the server every 750ms and measure latency
  function checkLatency() {
    const start = Date.now();
    socket.emit("pingCheck", () => {
      setLatency(Date.now() - start);
    });
  }

  interval = setInterval(checkLatency, 750); 

  return () => clearInterval(interval);
}, []);


useEffect(() => {
  let interval;
  // send a ping to the server every 750ms and measure latency
  function numClients() {
    socket.emit("getConnections", (connections) => {
      setNumConnections(connections);
    });
  }

  interval = setInterval(numClients, 2000); 
  return () => clearInterval(interval);
}, []);



  const [open, setOpen] = useState(false);
  return (
      
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{ position: "relative", cursor: "pointer" }}
      >
        <span> { 'SERVER: ' + ConnectionDetails() } </span>
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
    
            <ButtonGroup variant="contained" aria-label="Basic button group">
                <Button color="error" onClick={ disconnect } variant="contained">DISCONNECT</Button>
                <Button color="success" onClick={ connect } variant="contained">CONNECT</Button>
            </ButtonGroup>
            {isConnected ? (
              <div>
            <Typography  sx={{ color: 'black' }}>Latency: {latency} ms</Typography>
            <Typography  sx={{ color: 'black' }}>Clients Connected: {numConnections}</Typography>
              </div>
            ):
              <Typography  sx={{ color: 'black' }}>you are offline :(</Typography>}
             {/* <TextField id="outlined-basic" label="Address Placeholder" variant="outlined" /> */}
            
          </div>
        )}
      </div>
  );
}