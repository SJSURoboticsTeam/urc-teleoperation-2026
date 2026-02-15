import { socket } from "./socket";
import { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { green } from "@mui/material/colors";
import {red} from '@mui/material/colors'
import { useSocketStatus } from './socket';
import MapsHomeWorkIcon from '@mui/icons-material/MapsHomeWork';
import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import Box from '@mui/material/Box'
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';




export default function NavConnectionStatus({ openPane, setOpenPane }) {
  
    const isConnected = useSocketStatus();
    const [latency, setLatency] = useState(null);
    const [numConnections, setNumConnections] = useState(0);
    const [conntype, setconntype] = useState("Checking...");
      const [age, setAge] = useState('');

  const handleChange = (event) => {
    setAge(event.target.value);
  };

  
  function connect() {
    socket.connect();
  }

  function disconnect() {
    socket.disconnect();
  }
const [robotconnectedIcon,setrobotConnectedIcon] = useState("");

useEffect( () => {
  setrobotConnectedIcon(
    isConnected ? (
      <SettingsRemoteIcon sx={{ color: green[500], fontSize: 35 }} />
    ) : (
      <SettingsRemoteIcon sx={{ color: red[500], fontSize: 35 }} />
    )
  );
}, [isConnected] );

const [baseconnectedIcon,setbaseConnectedIcon] = useState("");

useEffect( () => {
  setbaseConnectedIcon(
    isConnected ? (
      <MapsHomeWorkIcon sx={{ color: green[500], fontSize: 35 }} />
    ) : (
      <MapsHomeWorkIcon sx={{ color: red[500], fontSize: 35 }} />
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
        SERVER{robotconnectedIcon}{baseconnectedIcon}
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
              width: "280px"
            }}
          >
    
            
            <Box sx={{display: "flex",flexDirection: "row",gap: 1,justifyContent: "center"}}>
                <Button color="error" onClick={ disconnect } variant="contained" sx={{width:140}}>DISCONNECT</Button>
                <Button color="success" onClick={ connect } variant="contained" sx={{width:140}}>CONNECT</Button>
            </Box>
            {isConnected ? (
              <div>
            <Typography  sx={{ color: 'black' }}>Latency: {latency} ms</Typography>
            <Typography  sx={{ color: 'black' }}>Clients Connected: {numConnections}</Typography>
            <Typography  sx={{ color: 'black' }}>Websockets: {conntype}</Typography>
            <hr className="divider" />
            <Typography  sx={{ color: 'black' }} variant = "h6">CAN CONNECTIONS</Typography>
            {/* DRIVE CAN CONNECTION */}
            <Box sx={{display: "flex",flexDirection: "row",gap: 1}}>
              <FormControl sx={{flex:1}} size="small">
                <InputLabel id="demo-simple-select-label">DRIVE</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={age}
                  label="DRIVE"
                  onChange={handleChange}
                  fullwidth
                >
                  <MenuItem value={10}>Idle</MenuItem>
                  <MenuItem value={20}>DRIVE[878]</MenuItem>
                  <MenuItem value={20}>ARM[878]</MenuItem>
                  <MenuItem value={30}>DEV_1[89989]</MenuItem>
                  <MenuItem value={100}>PRI_D[89988]</MenuItem>
                  <MenuItem value={40}>/dev.usbserial.8998989323</MenuItem>
                </Select>
              </FormControl>
              <Button color="success" onClick={ connect } variant="contained" sx={{width:90}}>CONNECT</Button>
            </Box>
            <p></p>
            
            {/* ARM CAN CONNECTION */}
            <Box sx={{display: "flex",flexDirection: "row",gap: 1}}>
              <FormControl sx={{flex:1}} size="small">
                <InputLabel id="demo-simple-select-label">ARM</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={age}
                  label="ARM"
                  onChange={handleChange}
                  fullwidth
                >
                  <MenuItem value={10}>Idle</MenuItem>
                  <MenuItem value={20}>DRIVE[878]</MenuItem>
                  <MenuItem value={50}>ARM[878]</MenuItem>
                  <MenuItem value={30}>CAN[89988]</MenuItem>
                  <MenuItem value={40}>/dev.usbserial.8998989323</MenuItem>
                </Select>
              </FormControl>
              <Button color="success" onClick={ connect } variant="contained" sx={{width:90}}>CONNECT</Button>
            </Box>
            <hr className="divider" />
            <Typography  sx={{ color: 'black' }} variant = "h6">FEATURE TOGGLES</Typography>
            <Box sx={{display: "flex",flexDirection: "col",gap: 1}}>
              <Button color="success" onClick={ connect } variant="contained">START CPU METRICS</Button>
              <Button color="success" onClick={ connect } variant="contained">START UNIFI METRICS</Button>
            </Box>
            </div>
              
              
            ):
              <Typography  sx={{ color: 'black' }}>you are offline :(</Typography>}
             {/* <TextField id="outlined-basic" label="Address Placeholder" variant="outlined" /> */}
            
          </div>
        )}
      </div>
  );
}