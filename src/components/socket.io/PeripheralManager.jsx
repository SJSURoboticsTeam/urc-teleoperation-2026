import { robotsocket } from "./socket";
import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EjectIcon from "@mui/icons-material/Eject";
import { useSnackbar } from "notistack";

export default function PeripheralManager({ openPane }) {
  const { enqueueSnackbar } = useSnackbar();
  // can state
  const [canState, setcanState] = useState({
    driveState: "idle", // idle, connecting, active
    armState: "idle", // idle, connecting, active
    scienceState: "idle", // idle, connecting, active
    gpsState: "idle", // idle, connecting, active
    uartMode: "???", // ???, CAN, UART
    loading: true, // lock buttons, dropdowns when refreshing can data
    canIds: [], // array with every possible serial device
    driveId: "disconnect", // selected can id in dropdown or disconnect
    armId: "disconnect", // selected can id in dropdown or disconnect
    scienceId: "disconnect", // selected can id in dropdown or disconnect
    gpsId: "disconnect", // selected can id in dropdown or disconnect
  });

  function requestCanInfo() {
    // lock the ui so user can't do anything while loading
    setcanState((prev) => ({
      ...prev,
      loading: true,
    }));
    robotsocket.emit("getCanInfo", (data) => {
      //console.log(data);
      setcanState((prev) => ({
        ...prev,
        canIds: data["canIds"],
        driveId: data["driveId"],
        armId: data["armId"],
        scienceId: data["scienceId"],
        gpsId: data["gpsId"],
        uartMode: data["uartMode"],
        // assignment if connected or not by text
        driveState: data["driveId"] !== "disconnect" ? "active" : "idle",
        armState: data["armId"] !== "disconnect" ? "active" : "idle",
        scienceState: data["scienceId"] !== "disconnect" ? "active" : "idle",
        gpsState: data["gpsId"] !== "disconnect" ? "active" : "idle",
        loading: false,
      }));
    });
  }

  function connectDrive() {
    setcanState((prev) => ({
      ...prev,
      driveState: "connecting",
    }));
    console.log("Connecting Drive, Sending id " + canState.driveId);
    robotsocket.emit("connectDrive", canState.driveId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          driveState: "active",
        }));
      } else {
        enqueueSnackbar("Drive didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectDrive() {
    setcanState((prev) => ({
      ...prev,
      driveState: "connecting",
    }));
    console.log("Disconnecting drive");
    robotsocket.emit("disconnectDrive", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          driveState: "idle",
        }));
      } else {
        enqueueSnackbar("Drive didn't disconnect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }

  function connectArm() {
    setcanState((prev) => ({
      ...prev,
      armState: "connecting",
    }));
    console.log("Connecting Arm, Sending id " + canState.armId);
    robotsocket.emit("connectArm", canState.armId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          armState: "active",
        }));
      } else {
        enqueueSnackbar("Arm didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectArm() {
    setcanState((prev) => ({
      ...prev,
      armState: "connecting",
    }));
    console.log("Disconnecting Arm");
    robotsocket.emit("disconnectArm", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          armState: "idle",
        }));
      } else {
        enqueueSnackbar("Arm didn't disconnect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }

  function connectScience() {
    setcanState((prev) => ({
      ...prev,
      scienceState: "connecting",
    }));
    console.log("Connecting Science, Sending id " + canState.scienceId);
    robotsocket.emit("connectScience", canState.scienceId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          scienceState: "active",
        }));
      } else {
        enqueueSnackbar("Science didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectScience() {
    setcanState((prev) => ({
      ...prev,
      scienceState: "connecting",
    }));
    console.log("Disconnecting Science");
    robotsocket.emit("disconnectScience", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          scienceState: "idle",
        }));
      } else {
        enqueueSnackbar("Science didn't disconnect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }

  function connectGPS() {
    setcanState((prev) => ({
      ...prev,
      gpsState: "connecting",
    }));
    console.log("Connecting GPS, Sending id " + canState.gpsId);
    robotsocket.emit("connectGPS", canState.gpsId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          gpsState: "active",
        }));
      } else {
        enqueueSnackbar("GPS didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectGPS() {
    setcanState((prev) => ({
      ...prev,
      gpsState: "connecting",
    }));
    console.log("Disconnecting GPS");
    robotsocket.emit("disconnectGPS", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          gpsState: "idle",
        }));
      } else {
        enqueueSnackbar(
          "GPS didn't disconnect, auto-updating to current state",
          { variant: "error" },
        );
        requestCanInfo();
      }
    });
  }
  function disconnectAll() {
    if (canState.driveState != "idle") {
      disconnectDrive();
    }
    if (canState.armState != "idle") {
      disconnectArm();
    }
    if (canState.scienceState != "idle") {
      disconnectScience();
    }
    if (canState.gpsState != "idle") {
      disconnectGPS();
    }
    console.log("ALL have been disconnected.");
  }

  useEffect(() => {
    if (openPane == "Backend") {
      requestCanInfo(); // autoload can info
    } else {
      setcanState((prev) => ({
        ...prev,
        // lock so next time so reload has to happen first (and unlock)
        loading: true,
      }));
    }
  }, [openPane]);

  return (
    <div>
      <Typography sx={{ color: "black", mt: -1 }} variant="h6">
        PERIPHERAL MANAGER
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1 }}>
        <Button
          variant="contained"
          loading={canState.loading}
          onClick={requestCanInfo}
          sx={{ width: 140 }}
        >
          REFRESH
        </Button>
        <Button
          disabled={
            canState.driveState != "active" &&
            canState.armState != "active" &&
            canState.scienceState != "active" &&
            canState.gpsState != "active"
          }
          color="error"
          variant="contained"
          loading={canState.loading}
          onClick={disconnectAll}
          sx={{ width: 140 }}
        >
          STOP ALL
        </Button>
      </Box>

      {/* DRIVE CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="demo-simple-select-label">
            DRIVE over {canState.uartMode}
          </InputLabel>
          <Select
            value={canState.driveId}
            label={"DRIVE over " + canState.uartMode}
            disabled={canState.loading || canState.driveState != "idle"}
            onChange={(event) =>
              setcanState((prev) => ({
                ...prev,
                driveId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {canState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === canState.armId ||
                  canId === canState.scienceId ||
                  canId === canState.gpsId
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
          color={canState.driveState === "idle" ? "success" : "error"}
          disabled={canState.loading || canState.driveId == "disconnect"}
          loading={canState.driveState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={
            canState.driveState == "idle" ? connectDrive : disconnectDrive
          }
          variant="contained"
        >
          {canState.driveState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>

      {/* ARM CAN CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="demo-simple-select-label">ARM</InputLabel>
          <Select
            value={canState.armId}
            label="ARM"
            disabled={canState.loading || canState.armState != "idle"}
            onChange={(event) =>
              setcanState((prev) => ({
                ...prev,
                armId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {canState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === canState.driveId ||
                  canId === canState.scienceId ||
                  canId === canState.gpsId
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
          color={canState.armState === "idle" ? "success" : "error"}
          disabled={canState.loading || canState.armId == "disconnect"}
          loading={canState.armState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={canState.armState == "idle" ? connectArm : disconnectArm}
          variant="contained"
        >
          {canState.armState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
      {/* SCIENCE CAN CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="demo-simple-select-label">SCIENCE</InputLabel>
          <Select
            value={canState.scienceId}
            label="SCIENCE"
            disabled={canState.loading || canState.scienceState != "idle"}
            onChange={(event) =>
              setcanState((prev) => ({
                ...prev,
                scienceId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {canState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === canState.driveId ||
                  canId === canState.armId ||
                  canId === canState.gpsId
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
          color={canState.scienceState === "idle" ? "success" : "error"}
          disabled={canState.loading || canState.scienceId == "disconnect"}
          loading={canState.scienceState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={
            canState.scienceState == "idle" ? connectScience : disconnectScience
          }
          variant="contained"
        >
          {canState.scienceState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
      {/* GPS CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="demo-simple-select-label">GPS</InputLabel>
          <Select
            value={canState.gpsId}
            label="GPS"
            disabled={canState.loading || canState.gpsState != "idle"}
            onChange={(event) =>
              setcanState((prev) => ({
                ...prev,
                gpsId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {canState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === canState.driveId ||
                  canId === canState.armId ||
                  canId === canState.scienceId
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
          color={canState.gpsState === "idle" ? "success" : "error"}
          disabled={canState.loading || canState.gpsId == "disconnect"}
          loading={canState.gpsState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={canState.gpsState == "idle" ? connectGPS : disconnectGPS}
          variant="contained"
        >
          {canState.gpsState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
    </div>
  );
}
