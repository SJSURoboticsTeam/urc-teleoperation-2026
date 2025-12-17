import { socket } from "../socket.io/socket";
import { useState, useEffect } from "react";
import Typography from '@mui/material/Typography';
import InfoIcon from '@mui/icons-material/Info';
import { green } from "@mui/material/colors";
import {red} from '@mui/material/colors'


export default function Metrics({ openPane, setOpenPane }) {
  
    const [isConnected, setIsConnected] = useState(socket.connected)
    // antenna telemtry
    const [roverRSSI, setroverRSSI] = useState(null);
    const [txrate, settxrate] = useState(null);
    const [freq, setfreq] = useState(null);
    const [freqw, setfreqw] = useState(null);
    const[antennastatus, setantennastatus] = useState("NO DATA YET");
  
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
  socket.on('antennastats', (data) => {
    console.log("Antenna Data");
    console.log(data)
    setantennastatus(data.status);
    if(data.status==1) {
      setroverRSSI(data.dbm);
      settxrate(data.txrate);
      setfreq(data.freq);
      setfreqw(data.freqw);
    }
  });
},[]);



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
            <Typography  sx={{ color: 'black' }} variant = "h6">ROVER ANTENNA</Typography>
            
            {(antennastatus === "GOOD") ? (
              <div>
            <Typography  sx={{ color: 'black' }}>Signal Strength: {roverRSSI} dBm</Typography>
            <Typography  sx={{ color: 'black' }}>Transmit Rate: {txrate} Mbps</Typography>
            <Typography  sx={{ color: 'black' }}>Frequency: {freq} MHz</Typography>
            <Typography  sx={{ color: 'black' }}>Frequency Width: {freqw} MHz</Typography>
              </div>
            ) : (<Typography  sx={{ color: 'black' }}>{antennastatus} </Typography>)}
              

              <Typography  sx={{ color: 'black' }} variant = "h6">PI STATUS</Typography>
              
              </div>
            ):
              <Typography  sx={{ color: 'black' }}>You aren't connected to the server! :(</Typography>}
            


          </div>
        )}
      </div>
  );
}