import { Typography } from "@mui/material";

export default function Clock({ openPane, setOpenPane, openUp = false }) {

  return (
    <div
      onMouseEnter={() => setOpenPane("Clock")}
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
        11:59PM - 42m remaining
      </span>
        
        {openPane == "Clock" && (
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
    
            <Typography  sx={{ color: 'black' }} variant = "h6">CLOCK MANAGER</Typography>


          </div>
        )}
      </div>
  );
}
