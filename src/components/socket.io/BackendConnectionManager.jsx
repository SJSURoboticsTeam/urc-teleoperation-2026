import { socket } from "./socket";
import { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import DnsIcon from '@mui/icons-material/Dns';
import { green } from "@mui/material/colors";
import {red} from '@mui/material/colors'
import { useSocketStatus } from './socket';


export default function NavConnectionStatus({ openPane, setOpenPane }) {
  
    const isConnected = useSocketStatus();
    const [latency, setLatency] = useState(null);
    const [numConnections, setNumConnections] = useState(0);
    const [conntype, setconntype] = useState("Checking...");
  
  function connect() {
    socket.connect();
  }

  function disconnect() {
    socket.disconnect();
  }
const [connectedIcon,setConnectedIcon] = useState("");

useEffect( () => {
  setConnectedIcon(
    isConnected ? (
      <DnsIcon sx={{ color: green[500], fontSize: 35 }} />
    ) : (
      <DnsIcon sx={{ color: red[500], fontSize: 35 }} />
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
  function getConnType() {
      if(socket.io.engine.transport.name == "websocket") {
        setconntype("Yes")
      } else {
        setconntype("No")
      }
  }
  interval = setInterval(getConnType, 2000); 
  return () => clearInterval(interval);
}, []);


  return (
      
      <div
        onMouseEnter={() => setOpenPane("Backend")}
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
          marginRight: 20,
        }}
      >
        SERVER{connectedIcon}
      </span>
        
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
            <Typography  sx={{ color: 'black' }}>Websockets: {conntype}</Typography>
              </div>
            ):
              <Typography  sx={{ color: 'black' }}>you are offline :(</Typography>}
             {/* <TextField id="outlined-basic" label="Address Placeholder" variant="outlined" /> */}
            
          </div>
        )}
      </div>
  );
}