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
  Select,
  MenuItem,
} from "@mui/material";
import { useEffect, useState } from "react";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import { useConnectionStatus } from "../../contexts/ConnectionContext";
import NumberSpinner from "./numberspinner";

// TODO: replace with real waypoint list once one exists
const WAYPOINTS = ["Waypoint 1", "Waypoint 2", "Waypoint 3"];

export default function AntennaRotation({
  openPane,
  setOpenPane,
  openUp = false,
}) {
  const { baseConnected } = useConnectionStatus();
  const [txon, settxon] = useState(false);
  const [waypoint, setWaypoint] = useState("");
  const [angle, setAngle] = useState(0);
  const [mode, setMode] = useState("off");

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
          <Box sx={{ display: "flex", flexDirection: "row", ml: 1, mb: 1 }}>
            <FormControl>
              <RadioGroup
                aria-labelledby="antenna-rotation"
                name="radio-buttons-group"
                value= {mode}
                onChange={(event)=> setMode(event.target.value)}
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
                {/* Two-column grid so the waypoint dropdown and angle spinner
                    line up in the same column, with radios left-aligned */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "auto 160px",
                    alignItems: "center",
                    columnGap: 1,
                    rowGap: 1,
                  }}
                >
                  <FormControlLabel
                    value="waypoint"
                    sx={{ color: "black" }}
                    control={<Radio />}
                    label="Waypoint"
                  />
                  <Select
                    size="small"
                    value={waypoint}
                    onChange={(e) => setWaypoint(e.target.value)}
                    disabled={mode != "waypoint"}
                    displayEmpty
                    fullWidth
                    sx={{ textAlign: "left" }}
                  >
                    <MenuItem value="" disabled>
                      Select...
                    </MenuItem>
                    {WAYPOINTS.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>

                  <FormControlLabel
                    value="angle"
                    control={<Radio />}
                    label="Angle"
                    sx={{ color: "black" }}
                  />
                  <NumberSpinner
                    label="Angle"
                    value = {angle}
                    onValueChange={(value) => setAngle(value ?? 0)}
                    min={0}
                    max={360}
                    step={5}
                    size="small"
                    disabled={mode != "angle"}
                  />
                </Box>
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
