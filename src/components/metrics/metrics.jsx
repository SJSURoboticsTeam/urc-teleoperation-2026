import { socket } from "../socket.io/socket";
import { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import InfoIcon from '@mui/icons-material/Info';
import { green } from "@mui/material/colors";
import {red} from '@mui/material/colors'


export default function Metrics({ openPane, setOpenPane }) {
  
    const [isConnected, setIsConnected] = useState(socket.connected)
    // antenna telemtry
    const[antenna, setantennadata] = useState({
      status: "NO DATA YET",
      roverRSSI : null,
      txrate : null,
      rxrate: null,
      freq: null,
      freqw: null
    })
    
    const[rpidata, setrpidata] = useState({
      status: "NO DATA YET",
      cpupercent : null,
      rampercent : null,
      cputemp: null,
    })
  
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
  const handler = (data) => {
    // console.log("antenna data:", data);
      setantennadata({
        status: data.status,
        roverRSSI: data.dbm,
        txrate: data.txrate,
        rxrate: data.rxrate,
        freq: data.freq,
        freqw: data.freqwidth
      });
 
  };

  socket.on("antennastats", handler);

  return () => {
    socket.off("antennastats", handler); // cleanup so no duplicate listeners
  };
}, []);

useEffect(() => {
  const handler = (data) => {
    console.log("cpu data:", data);
      setrpidata({
        status: data.status,
        cpupercent: data.cpupercent,
        rampercent: data.rampercent,
        cputemp: data.cputemp
      });
  };

  socket.on("cpustats", handler);

  return () => {
    socket.off("cpustats", handler); // cleanup so no duplicate listeners
  };
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
              minWidth: "250px",
            }}
          >
    
            {isConnected ? (
              <div>
            <Typography  sx={{ color: 'black' }} variant = "h6">ROVER ANTENNA</Typography>
            
            {(antenna.status === "GOOD") ? (
              <div>
            <Typography  sx={{ color: 'black' }}>Signal Strength: {antenna.roverRSSI} dBm</Typography>
            <Typography  sx={{ color: 'black' }}>TX Speed: {antenna.txrate} Mbps</Typography>
            <Typography  sx={{ color: 'black' }}>RX Speed: {antenna.rxrate} Mbps</Typography>
            <Typography  sx={{ color: 'black' }}>Frequency: {antenna.freq} MHz</Typography>
            <Typography  sx={{ color: 'black' }}>Frequency Width: {antenna.freqw} MHz</Typography>
              </div>
            ) : (<Typography  sx={{ color: 'black' }}>{antenna.status} </Typography>)}
              
              <hr className="divider" />
              <Typography  sx={{ color: 'black' }} variant = "h6">RPI STATUS</Typography>


              {(rpidata.status === "GOOD") ? (
              <div>
            <Typography  sx={{ color: 'black' }}>Cpu Utilization: {rpidata.cpupercent}%</Typography>
            <Typography  sx={{ color: 'black' }}>RAM Utilization: {rpidata.rampercent}%</Typography>
            <Typography  sx={{ color: 'black' }}>Cpu Temp: {rpidata.cputemp}°C</Typography>
              </div>
            ) : (<Typography  sx={{ color: 'black' }}>{rpidata.status} </Typography>)}
              
              <hr className="divider" />
              <Typography  sx={{ color: 'black' }} variant = "h6">ROBOT</Typography>


              
              
              
              </div>
            ):
              <Typography  sx={{ color: 'black' }}>You aren't connected to the server! :(</Typography>}
            


          </div>
        )}
      </div>
  );
}