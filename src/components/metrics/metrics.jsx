import { socket } from "../socket.io/socket";
import React, { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import InfoIcon from '@mui/icons-material/Info';
import { green } from "@mui/material/colors";
import {red} from '@mui/material/colors'


export default function Metrics({ openPane, setOpenPane }) {
  
    const [isConnected, setIsConnected] = useState(socket.connected)
    const [latency, setLatency] = useState(null);
    const [roverRSSI, setroverRSSI] = useState(null);
    const [baseRSSI, setbaseRSSI] = useState(null);
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
  
const [connectedIcon,setConnectedIcon] = useState("");

useEffect( () => {
  setConnectedIcon(
    isConnected ? (
      <InfoIcon sx={{ color: green[500], fontSize: 35 }} />
    ) : (
      <InfoIcon sx={{ color: red[500], fontSize: 35 }} />
    )
  );
}, [isConnected] );


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

useEffect(() => {
  let interval;
  // send a ping to the server every 2s to get number of connected clients from backend
  function numroverRSSI() {
    socket.emit("roverRSSI", (connections) => {
      setroverRSSI(connections);
    });
  }

  interval = setInterval(numroverRSSI, 5000); 
  return () => clearInterval(interval);
}, []);

useEffect(() => {
  let interval;
  // send a ping to the server every 2s to get number of connected clients from backend
  function numbaseRSSI() {
    socket.emit("baseRSSI", (connections) => {
      setbaseRSSI(connections);
    });
  }

  interval = setInterval(numbaseRSSI, 5000); 
  return () => clearInterval(interval);
}, []);



  return (
      
      <div
        onMouseEnter={() => setOpenPane("Metrics")}
        onMouseLeave={() => setOpenPane("None")}
        // needed to detect hover and placement of popup
        style={{ position: "relative", cursor: "pointer", textAlign:'center'}}
      >
        <span
        style={{
          whiteSpace: "pre-wrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginRight: 10,
        }}
      >
        METRICS{connectedIcon}
      </span>
        
        {openPane == "Metrics" && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              border: "1px solid gray",
              padding: "10px",
              minWidth: "225px",
            }}
          >
    
            {isConnected ? (
              <div>
            <Typography  sx={{ color: 'black' }}>Rover Antenna: {roverRSSI}</Typography>
            <Typography  sx={{ color: 'black' }}>Base Antenna: {baseRSSI}</Typography>
              </div>
            ):
              <Typography  sx={{ color: 'black' }}>No metrics when offline! :(</Typography>}
             {/* <TextField id="outlined-basic" label="Address Placeholder" variant="outlined" /> */}
            
          </div>
        )}
      </div>
  );
}