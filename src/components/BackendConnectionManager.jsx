import { socket } from "../socket";
import React, { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';


export default function NavConnectionStatus({ openPane, setOpenPane }) {
  
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
  // send a ping to the server every 2s to get number of connected clients from backend
  function numClients() {
    socket.emit("getConnections", (connections) => {
      setNumConnections(connections);
    });
  }

  interval = setInterval(numClients, 2000); 
  return () => clearInterval(interval);
}, []);



  return (
      
      <div
        onMouseEnter={() => setOpenPane("Backend")}
        onMouseLeave={() => setOpenPane("None")}
        // needed to detect hover and placement of popup
        style={{ position: "relative", cursor: "pointer", textAlign:'center'}}
      >
        <span> { 'SERVER: ' + ConnectionDetails() } </span>
        {openPane == "Backend" && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              border: "1px solid gray",
              padding: "10px",
            }}
          >
    
            <ButtonGroup variant="contained" aria-label="Basic button group">
                <Button color="error" onClick={ disconnect } variant="contained" sx={{width:120}}>DISCONNECT</Button>
                <Button color="success" onClick={ connect } variant="contained" sx={{width:120}}>CONNECT</Button>
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