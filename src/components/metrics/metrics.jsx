import { socket } from "../socket.io/socket";
import { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import InfoIcon from '@mui/icons-material/Info';
import { green } from "@mui/material/colors";
import {red} from '@mui/material/colors'


export default function Metrics({ openPane, setOpenPane }) {
  
    const [isConnected, setIsConnected] = useState(socket.connected)
    const [roverRSSI, setroverRSSI] = useState(null);
    const [baseRSSI, setbaseRSSI] = useState(null);
  
    // Handles connection to socket.io server
    // this is still needed in this file since if the server goes down, so does all the metrics
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
  
const [infoStatus,setinfoStatus] = useState("");

useEffect( () => {
  setinfoStatus(
    isConnected ? (
      <InfoIcon sx={{ color: green[500], fontSize: 35 }} />
    ) : (
      <InfoIcon sx={{ color: red[500], fontSize: 35 }} />
    )
  );
}, [isConnected] );



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
        METRICS{infoStatus}
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
            
          </div>
        )}
      </div>
  );
}