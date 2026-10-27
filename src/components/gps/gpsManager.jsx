import { Typography } from "@mui/material";
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EjectIcon from "@mui/icons-material/Eject";
import { useEffect } from "react";


import { usePeripherals } from "../../contexts/PeripheralContext";
import { useSerial } from "../../contexts/SerialContext";
export default function GPSManager({ openPane, setOpenPane, openUp = false }) {

  const {
    servercanState,
    basecanState,
    requestCanInfo,
    setservercanState,
    setbasecanState,
    connectGPS,
    disconnectGPS,
    disconnectAll,
  } = usePeripherals();

    const { serialState, refresh } = useSerial();

  useEffect(() => {
    if (openPane == "GPSManager") {
      requestCanInfo(); // autoload can serialState
      refresh() // update serial
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
    
            <Typography  sx={{ color: 'black' }} variant = "h6">GPS MANAGER</Typography>
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
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="gps-dropdown-peripheral-id">ROVER</InputLabel>
          <Select
            value={servercanState.gps.id}
            label="ROVER"
            labelId="gps-dropdown-peripheral-id"
            disabled={servercanState.loading || servercanState.gps.state != "idle"}
                  onChange={(event) =>
                    setservercanState((current) => ({
                      ...current,
                      gps: {
                        ...current.id,
                        "id": event.target.value,
                      },
                    }))
                  }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {servercanState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === servercanState.drive.id ||
                  canId === servercanState.arm.id ||
                  canId === servercanState.science.id ||
                  canId === serialState.port.id
                }
                key={canId}
                value={canId}
              >
                {canId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          color={servercanState.gps.state === "idle" ? "success" : "error"}
          disabled={servercanState.loading || servercanState.gps.id == "disconnect"}
          loading={servercanState.gps.state == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={servercanState.gps.state == "idle" ? connectGPS : disconnectGPS}
          variant="contained"
        >
          {servercanState.gps.state == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
            {/* BASE ANTENNA CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="gps-dropdown-peripheral-id">BASE</InputLabel>
          <Select
            value={basecanState.gps.id}
            label="BASE"
            labelId="antenna-dropdown-peripheral-id"
            disabled={basecanState.loading || basecanState.gps.state != "idle"}
                  onChange={(event) =>
                    setbasecanState((current) => ({
                      ...current,
                      gps: {
                        ...current.id,
                        "id": event.target.value,
                      },
                    }))
                  }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {basecanState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === basecanState.gps.Id
                }
                key={canId}
                value={canId}
              >
                {canId}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          color={basecanState.gps.state === "idle" ? "success" : "error"}
          disabled={basecanState.loading || basecanState.gps.id == "disconnect"}
          loading={basecanState.gps.state == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={basecanState.gps.state == "idle" ? connectGPS : disconnectGPS}
          variant="contained"
        >
          {servercanState.gps.state == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>


          </div>
        )}
      </div>
  );
}
