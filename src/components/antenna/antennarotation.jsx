import {
  Typography,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Box,
  Switch,
  Button,
} from "@mui/material";
import { useEffect, useState } from "react";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import { useConnectionStatus } from "../../contexts/ConnectionContext";

export default function AntennaRotation({
  openPane,
  setOpenPane,
  openUp = false,
}) {
  const { baseConnected } = useConnectionStatus();
  const [txon, settxon] = useState(false);

  return (
    <div
      onMouseEnter={() => setOpenPane("AntennaRotation")}
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
        ANTENNA
        <ControlCameraIcon sx={{ fontSize: 35 }} />
      </span>

      {openPane == "AntennaRotation" && (
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
            minWidth: "300px",
            borderRadius: "12px",
          }}
        >
          <Typography sx={{ color: "black" }} variant="h6">
            ANTENNA ROTATION
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "row", ml: 2 }}>
            <FormControl>
              <RadioGroup
                aria-labelledby="antenna-rotation"
                defaultValue="off"
                name="radio-buttons-group"
              >
                <FormControlLabel
                  value="off"
                  control={<Radio />}
                  label="Off"
                  sx={{ color: "black" }}
                />
                <FormControlLabel
                  value="gps"
                  control={<Radio />}
                  label="Use GPS"
                  sx={{ color: "black" }}
                />
                <FormControlLabel
                  value="waypoint"
                  sx={{ color: "black" }}
                  control={<Radio />}
                  label="Waypoint"
                />
                <FormControlLabel
                  value="manual"
                  control={<Radio />}
                  label="Manual Angle"
                  sx={{ color: "black" }}
                />
              </RadioGroup>
            </FormControl>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={txon}
                  onChange={(e) => settxon(e.target.checked)}
                  //disabled={controlsLocked}
                />
              }
              label="AUTO TX"
              componentsProps={{
                typography: {
                  sx: { whiteSpace: "nowrap", color: "black" },
                },
              }}
            />

            <Button
              variant="contained"
              //onClick={handleManualTx}
              sx={{ whiteSpace: "nowrap" }}
              disabled={!baseConnected}
            >
              MANUAL TX
            </Button>
          </Box>
        </div>
      )}
    </div>
  );
}
