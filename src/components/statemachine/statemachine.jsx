import { Typography } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import {useState, useEffect} from "react"
import { basesocket, robotsocket } from "../socket.io/socket";

export default function StateMachine({ openPane, setOpenPane, missionMode }) {
  const [autonomyData, setautonomyData] = useState({
   isBooted: null,
   isTeleoperating: null
});
  
  useEffect(() => {
    const handler = (data) => {
      console.log("autonomy data:", data);
      setautonomyData( (prev) => ({
        ...prev,
        isBooted: data.isBooted,
        isTeleoperating: data.isTeleoperating,
      }));
    };
    robotsocket.on("autonomyData", handler);
    return () => {
      robotsocket.off("autonomyData", handler); // cleanup so no duplicate listeners
    };
  }, []);
  return (
    <div
      onMouseEnter={() => setOpenPane("StateMachine")}
      onMouseLeave={() => setOpenPane("None")}
      // needed to detect hover and placement of popup
      style={{ position: "relative", cursor: "pointer", textAlign: "center" }}
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
        STATUS
        <InfoIcon sx={{ fontSize: 35 }} />
      </span>
        
        {openPane == "StateMachine" && (
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
              borderRadius: "12px",
            }}
          >
    
            <Typography  sx={{ color: 'black' }} variant = "h6">STATE MACHINE</Typography>
            <Typography  sx={{ color: 'black' }}>
              Current Mode: {missionMode ?? "UNKNOWN"}
            </Typography>
            <Typography  sx={{ color: 'black' }}>
              Is Teleoperating: {String(autonomyData.isTeleoperating)}
            </Typography>
            <Typography  sx={{ color: 'black' }}>
              isBooted: {String(autonomyData.isBooted)}
            </Typography>


          </div>
        )}
      </div>
  );
}
