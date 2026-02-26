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
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import EjectIcon from '@mui/icons-material/Eject';




export default function NavConnectionStatus({ openPane, setOpenPane,setErrorMessage, errorMessage }) {
  
    const isConnected = useSocketStatus(); // get socket status from ui
    const [latency, setLatency] = useState(null); // integer of rough estimated latency based on roundtrip ping
    const [numConnections, setNumConnections] = useState(0); // integer with clients that polls from backend
    const [conntype, setconntype] = useState("Checking..."); // awaiting data ("checking"), websockets ("Yes"), polling ("No")
    const[canState, setcanState] = useState({
      driveState : "idle", // idle, connecting, active
      armState : "idle", // idle, connecting, active
      scienceState : "idle", // idle, connecting, active
      loading: true, // lock buttons, dropdowns when refreshing can data
      canIds : [], // array with every possible serial device
      driveId: "disconnect", // selected can id in dropdown or disconnect 
      armId: "disconnect", // selected can id in dropdown or disconnect
      scienceId: "disconnect", // selected can id in dropdown or disconnect

    })



  // server connect, disconnect
  function connect() {
    socket.connect();
  }

  function disconnect() {
    socket.disconnect();
  }
const [robotconnectedIcon,setrobotConnectedIcon] = useState("");

//icons and if connected
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
  // see if client is connected optimally (websockets) or not
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

function requestCanInfo() {
    // lock the ui so user can't do anything while loading
  setcanState( (prev) => ({
      ...prev,
      loading: true
    }));
  socket.emit("getCanInfo", (data) => {
    //console.log(data);
    setcanState( (prev) => ({
      ...prev,
      canIds: data["canIds"],
      driveId: data["driveId"],
      armId: data["armId"],
      scienceId: data["scienceId"],
      // assignment if connected or not by text
      driveState: ( data["driveId"] !== "disconnect") ?  "active" : "idle",
      armState: ( data["armId"] !== "disconnect") ?  "active" : "idle",
      scienceState: ( data["scienceId"] !== "disconnect") ?  "active" : "idle",
      loading: false
    }));
    });
}

function connectDrive() {
      setcanState( (prev) => ({
      ...prev,
      driveState: "connecting"
    }));
    console.log("Connecting, Sending id " + canState.driveId)
  socket.emit("connectDrive", canState.driveId, (response) => {
    console.log("RESPONSE:" + response);
    if(response === "OK") {
          setcanState( (prev) => ({
            ...prev,
            driveState: "active"
          }));
  } else {
          setErrorMessage("Drive didn't connect, auto-updating to current state");
          requestCanInfo();
  }
  })
}
function disconnectDrive() {
      setcanState( (prev) => ({
      ...prev,
      driveState: "connecting"
    }));
    console.log("Disconnecting");
  socket.emit("disconnectDrive", (response) => {
    console.log("RESPONSE:" + response);
    if(response === "OK") {
          setcanState( (prev) => ({
            ...prev,
            driveState: "idle"
          }));
  } else {
          setErrorMessage("Drive didn't disconnect, auto-updating to current state");
          requestCanInfo();
  }
  })
}

function connectArm() {
      setcanState( (prev) => ({
      ...prev,
      armState: "connecting"
    }));
    console.log("Connecting, Sending id " + canState.armId)
  socket.emit("connectArm", canState.armId, (response) => {
    console.log("RESPONSE:" + response);
    if(response === "OK") {
          setcanState( (prev) => ({
            ...prev,
            armState: "active"
          }));
  } else {
     setErrorMessage("Arm didn't connect, auto-updating to current state");
     requestCanInfo();
  }
  })
}
function disconnectArm() {
      setcanState( (prev) => ({
      ...prev,
      armState: "connecting"
    }));
    console.log("Disconnecting");
  socket.emit("disconnectArm", (response) => {
    console.log("RESPONSE:" + response);
    if(response === "OK") {
          setcanState( (prev) => ({
            ...prev,
            driveState: "idle"
          }));
  } else {
          setErrorMessage("Arm didn't disconnect, auto-updating to current state");
          requestCanInfo();
  }
  })

}

function connectScience() {
      setcanState( (prev) => ({
      ...prev,
      scienceState: "connecting"
    }));
    console.log("Connecting, Sending id " + canState.scienceId)
  socket.emit("connectScience", canState.scienceId, (response) => {
    console.log("RESPONSE:" + response);
    if(response === "OK") {
          setcanState( (prev) => ({
            ...prev,
            scienceState: "active"
          }));
  } else {
     setErrorMessage("Science didn't connect, auto-updating to current state");
     requestCanInfo();
  }
  })
}
function disconnectScience() {
      setcanState( (prev) => ({
      ...prev,
      scienceState: "connecting"
    }));
    console.log("Disconnecting");
  socket.emit("disconnectScience", (response) => {
    console.log("RESPONSE:" + response);
    if(response === "OK") {
          setcanState( (prev) => ({
            ...prev,
            scienceState: "idle"
          }));
  } else {
          setErrorMessage("Science didn't disconnect, auto-updating to current state");
          requestCanInfo();
  }
  })

}

  useEffect( () => {
    if(openPane == "Backend") {
      requestCanInfo();
    } else {
          setcanState( (prev) => ({
            ...prev,
            // lock so next time so reload has to happen first (and unlock)
            loading: true 
          }));
    }
},[openPane]);



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
              width: "300px",
              borderRadius: "4px"
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
            <Typography  sx={{ color: 'black', m: 0 }} variant = "h6">CAN CONNECTIONS</Typography>
            <Box sx={{display: "flex",flexDirection: "row",gap: 1}}>
              <Button   variant="contained" loading={canState.loading} onClick={requestCanInfo} sx={{width:140}}>REFRESH</Button>
              <Button disabled={canState.loading || canState.driveId=="disconnect"} loading={canState.driveState=="connecting"} color="success" sx={{width:140}} onClick={ (canState.driveState == "idle") ? connectDrive : disconnectDrive } variant="contained">DRIVE 
               { (canState.driveState == "idle") ? <ElectricalServicesIcon/> : <EjectIcon/> }</Button>
            </Box>

            <Box sx={{display: "flex",flexDirection: "row",gap: 1,pt:1}}>
              <Button disabled={canState.loading || canState.armId=="disconnect"} loading={canState.armState=="connecting"} color="success" sx={{width:140}} onClick={ (canState.armState == "idle") ? connectArm : disconnectArm } variant="contained">ARM 
               { (canState.armState == "idle") ? <ElectricalServicesIcon/> : <EjectIcon/> }</Button>
               <Button disabled={canState.loading || canState.scienceId=="disconnect"} loading={canState.scienceState=="connecting"} color="success" sx={{width:140}} onClick={ (canState.scienceState == "idle") ? connectScience : disconnectScience } variant="contained">SCIENCE 
               { (canState.scienceState == "idle") ? <ElectricalServicesIcon/> : <EjectIcon/> }</Button>
            </Box>

            {/* DRIVE CAN CONNECTION */}
            <Box sx={{display: "flex",flexDirection: "row",gap: 1,mt:1}}>
              <FormControl sx={{flex:1}} size="small">
                <InputLabel id="demo-simple-select-label">DRIVE</InputLabel>
                <Select
                  value={canState.driveId}
                  label="DRIVE"
                  disabled={canState.loading || canState.driveState != "idle"}
                  onChange={(event) =>
                    setcanState((prev) => ({
                      ...prev,
                      driveId: event.target.value,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value={"disconnect"}>Disconnect</MenuItem>
                {canState.canIds?.map((canId) => (
                  <MenuItem disabled={canId === canState.armId || canId === canState.scienceId} key={canId} value={canId}>
                    {canId}
                  </MenuItem>
                ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* ARM CAN CONNECTION */}
            <Box sx={{display: "flex",flexDirection: "row",gap: 1,mt:1}}>
              <FormControl sx={{flex:1}} size="small">
                <InputLabel id="demo-simple-select-label">ARM</InputLabel>
                <Select
                  value={canState.armId}
                  label="ARM"
                  disabled={canState.loading || canState.armState != "idle"}
                  onChange={(event) =>
                        setcanState((prev) => ({
                          ...prev,
                          armId: event.target.value,
                        }))
                      }
                  fullWidth
                >
                  
                <MenuItem value={"disconnect"}>Disconnect</MenuItem>
                {canState.canIds?.map((canId) => (
                  <MenuItem disabled={canId === canState.driveId || canId === canState.scienceId} key={canId} value={canId}>
                    {canId}    
                  </MenuItem>
                ))}
                </Select>
              </FormControl>
            </Box>
                {/* SCIENCE CAN CONNECTION */}
            <Box sx={{display: "flex",flexDirection: "row",gap: 1,mt:1}}>
              <FormControl sx={{flex:1}} size="small">
                <InputLabel id="demo-simple-select-label">SCIENCE</InputLabel>
                <Select
                  value={canState.scienceId}
                  label="SCIENCE"
                  disabled={canState.loading || canState.scienceState != "idle"}
                  onChange={(event) =>
                        setcanState((prev) => ({
                          ...prev,
                          scienceId: event.target.value,
                        }))
                      }
                  fullWidth
                >
                  
                <MenuItem value={"disconnect"}>Disconnect</MenuItem>
                {canState.canIds?.map((canId) => (
                  <MenuItem disabled={canId === canState.driveId || canId === canState.armId} key={canId} value={canId}>
                    {canId}    
                  </MenuItem>
                ))}
                </Select>
              </FormControl>
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