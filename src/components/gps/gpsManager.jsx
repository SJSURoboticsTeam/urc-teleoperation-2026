import { Typography } from "@mui/material";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { useEffect } from "react";

import { usePeripherals } from "../../contexts/PeripheralContext";
import { useSerial } from "../../contexts/SerialContext";
import PeripheralDropdown from "../socket.io/PeripheralDropdown";
export default function GPSManager({ openPane, setOpenPane, openUp = false }) {
  const {
    servercanState,
    requestCanInfo,
    setservercanState,
    disconnectAll,
  } = usePeripherals();

  const { refresh } = useSerial();

  useEffect(() => {
    if (openPane == "GPSManager") {
      requestCanInfo(); // autoload can serialState
      refresh(); // update serial
    } else {
      setservercanState((prev) => ({
        ...prev,
        // lock so next time so reload has to happen first (and unlock)
        loading: true,
      }));
    }
  }, [openPane]);

  return (
    <div
      onMouseEnter={() => setOpenPane("GPSManager")}
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
        GPS
        <GpsFixedIcon sx={{ fontSize: 35 }} />
      </span>

      {openPane == "GPSManager" && (
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
          <Typography sx={{ color: "black" }} variant="h6">
            GPS MANAGER
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
            <Button
              variant="contained"
              loading={servercanState.loading}
              onClick={requestCanInfo}
              sx={{ width: 140 }}
            >
              REFRESH
            </Button>
            <Button
              disabled={
                servercanState.drive.state != "active" &&
                servercanState.arm.state != "active" &&
                servercanState.science.state != "active" &&
                servercanState.gps.state != "active"
              }
              color="error"
              variant="contained"
              loading={servercanState.loading}
              onClick={disconnectAll}
              sx={{ width: 140 }}
            >
              STOP ALL
            </Button>
          </Box>

          {/* ROVER GPS CONNECTION */}
          <PeripheralDropdown id="gps" isRover />

          {/* BASE GPS CONNECTION */}
          <PeripheralDropdown id="gps" />
        </div>
      )}
    </div>
  );
}
