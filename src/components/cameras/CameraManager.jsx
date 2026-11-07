import { Typography } from "@mui/material";
import VideoCameraBackIcon from '@mui/icons-material/VideoCameraBack';

export default function CameraManager({ openPane, setOpenPane, openUp = false }) {

  return (
    <div
      onMouseEnter={() => setOpenPane("CameraManager")}
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
          marginRight: 20,
        }}
      >
        CAMERAS
        <VideoCameraBackIcon sx={{ fontSize: 35 }} />
      </span>
        
        {openPane == "CameraManager" && (
          <div
            style={{
              position: "absolute",
              // open above the anchor when the bar is at the bottom of the screen
              ...(openUp ? { bottom: "100%" } : { top: "100%" }),
              left: "50%",
              transform: "translateX(-50%)",
              background: "white",
              border: "1px solid gray",
              padding: "10px",
              minWidth: "250px",
              borderRadius: "12px",
            }}
          >
    
            <Typography  sx={{ color: 'black' }} variant = "h6">CAMERA MANAGER</Typography>


          </div>
        )}
      </div>
  );
}
