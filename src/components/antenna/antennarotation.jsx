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
import { useEffect, useState, useCallback } from "react";
import ControlCameraIcon from "@mui/icons-material/ControlCamera";
import { useConnectionStatus } from "../../contexts/ConnectionContext";
import NumberSpinner from "./numberspinner";
import { basesocket } from "../socket.io/socket";
import { useSnackbar } from "notistack";

// TODO: replace with real waypoint list once one exists
const WAYPOINTS = ["Waypoint 1", "Waypoint 2", "Waypoint 3"];

export default function AntennaRotation({
  openPane,
  setOpenPane,
  openUp = false,
}) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { baseConnected } = useConnectionStatus();
  const [data, setData] = useState({
    txon: false,
    waypointName: "",
    manualAngle: 0,
    mode: "off",
    loading: true,
  });

  const updateAntennaSettings = (value, key) => {
    // update array & send over network

    const updatedData = { ...data, [key]: value };
    setData(updatedData);
    const payload = {
      txon: updatedData.txon,
      mode: updatedData.mode,
      manualAngle: updatedData.manualAngle,
    };
    console.log(payload);
    basesocket.emit("setAntennaSettings", payload, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setData((current) => ({
          ...current,
        }));
      } else {
        enqueueSnackbar("Error saving antenna settings", {
          variant: "error",
        });
        requestAntennaInfo();
      }
    });
  };

  async function antennaPulse()  {
    //console.log("Pulsing antenna");
    basesocket.emit("antennaPulse", (response) => {
      console.log("PULSE RESPONSE:" + response);
      if (response !== "OK") {
        enqueueSnackbar("Manual pulse failed", {
          variant: "error",
        });
        requestAntennaInfo();
      }
    });
  };

  const requestAntennaInfo = useCallback(() => {
    // lock the ui so user can't do anything while loading
    console.log("Refresh requested...");
    setData((prev) => ({
      ...prev,
      loading: true,
    }));
    if (basesocket.connected) {
      basesocket.emit("getAntennaSettings", (data) => {
        //console.log(data);
        setData((prev) => ({
          ...prev,
          txon: data["txon"],
          mode: data["mode"],
          manualAngle: data["manualAngle"],
          loading: false,
        }));
      });
    }
  }, []);

  useEffect(() => {
    if (openPane == "AntennaRotation") {
      requestAntennaInfo(); // update serial
    } else {
      setData((prev) => ({
        ...prev,
        // lock so next time so reload has to happen first (and unlock)
        loading: true,
      }));
    }
  }, [openPane, requestAntennaInfo]);

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
                value={data.mode}
                onChange={(event) => updateAntennaSettings(event.target.value, "mode")}
                
              >
                <FormControlLabel
                  value="off"
                  control={<Radio />}
                  label="Off"
                  disabled={data.loading}
                  sx={{ color: "black" }}
                />
                <FormControlLabel
                  value="gps"
                  control={<Radio />}
                  label="Use GPS"
                  disabled={data.loading}
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
                    disabled={data.loading}
                    label="Waypoint"
                  />
                  <Select
                    size="small"
                    value={data.waypointName}
                    onChange={(event) => updateAntennaSettings(event.target.value, "waypointName")}
                    disabled={data.mode != "waypoint" || data.loading}
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
                    disabled={data.loading}
                    sx={{ color: "black" }}
                  />
                  <NumberSpinner
                    label="Angle"
                    value={data.manualAngle}
                    onValueChange={(value) => updateAntennaSettings(value, "manualAngle")}
                    min={0}
                    max={360}
                    step={5}
                    size="small"
                    disabled={data.mode != "angle" || data.loading}
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
                  checked={data.txon}
                  disabled={data.loading}
                  onChange={(event) => updateAntennaSettings(event.target.checked, "txon")}
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
              onClick={antennaPulse}
              sx={{ whiteSpace: "nowrap" }}
              disabled={!baseConnected || data.loading}
              loading={data.loading}
            >
              MANUAL TX
            </Button>
          </Box>
        </div>
      )}
    </div>
  );
}
