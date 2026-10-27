import { useEffect } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EjectIcon from "@mui/icons-material/Eject";
import { usePeripherals } from "../../contexts/PeripheralContext";
import { useSerial } from "../../contexts/SerialContext";

// Read shared connection state from the centralized context
import { useConnectionStatus } from "../../contexts/ConnectionContext";

export default function PeripheralManager({ openPane }) {
  const {
    servercanState,
    basecanState,
    requestCanInfo,
    setservercanState,
    setbasecanState,
    connectDrive,
    disconnectDrive,
    connectArm,
    disconnectArm,
    connectScience,
    disconnectScience,
    disconnectAll,
  } = usePeripherals();
  const { serialState, refresh } = useSerial();

    const {
      robotConnected: isRobotConnected,
      baseConnected: isBaseConnected,
    } = useConnectionStatus();

  useEffect(() => {
    if (openPane == "Backend") {
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
    <div>
      <Typography sx={{ color: "black", mt: -1 }} variant="h6">
        PERIPHERAL MANAGER
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
            servercanState.driveState != "active" &&
            servercanState.armState != "active" &&
            servercanState.scienceState != "active" &&
            servercanState.gpsState != "active"
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
         {(isRobotConnected) ? (
          <div>
      {/* DRIVE CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="drive-dropdown-peripheral-id">
            DRIVE over {servercanState.uartMode}
          </InputLabel>
          <Select
            value={servercanState.driveId}
            label={"DRIVE over " + servercanState.uartMode}
            labelId="drive-dropdown-peripheral-id"
            disabled={servercanState.loading || servercanState.driveState != "idle"}
            onChange={(event) =>
              setservercanState((prev) => ({
                ...prev,
                driveId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {servercanState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === servercanState.armId ||
                  canId === servercanState.scienceId ||
                  canId === servercanState.gpsId ||
                  canId === serialState.portId
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
          color={servercanState.driveState === "idle" ? "success" : "error"}
          disabled={servercanState.loading || servercanState.driveId == "disconnect"}
          loading={servercanState.driveState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={
            servercanState.driveState == "idle" ? connectDrive : disconnectDrive
          }
          variant="contained"
        >
          {servercanState.driveState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>

      {/* ARM CAN CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="arm-dropdown-peripheral-id">ARM</InputLabel>
          <Select
            value={servercanState.armId}
            label="ARM"
            labelId="arm-dropdown-peripheral-id"
            disabled={servercanState.loading || servercanState.armState != "idle"}
            onChange={(event) =>
              setservercanState((prev) => ({
                ...prev,
                armId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {servercanState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === servercanState.driveId ||
                  canId === servercanState.scienceId ||
                  canId === servercanState.gpsId ||
                  canId === serialState.portId
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
          color={servercanState.armState === "idle" ? "success" : "error"}
          disabled={servercanState.loading || servercanState.armId == "disconnect"}
          loading={servercanState.armState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={servercanState.armState == "idle" ? connectArm : disconnectArm}
          variant="contained"
        >
          {servercanState.armState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
      {/* SCIENCE CAN CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="science-dropdown-peripheral-id">SCIENCE</InputLabel>
          <Select
            value={servercanState.scienceId}
            label="SCIENCE"
            labelId="science-dropdown-peripheral-id"
            disabled={servercanState.loading || servercanState.scienceState != "idle"}
            onChange={(event) =>
              setservercanState((prev) => ({
                ...prev,
                scienceId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {servercanState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === servercanState.driveId ||
                  canId === servercanState.armId ||
                  canId === servercanState.gpsId ||
                  canId === serialState.portId
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
          color={servercanState.scienceState === "idle" ? "success" : "error"}
          disabled={servercanState.loading || servercanState.scienceId == "disconnect"}
          loading={servercanState.scienceState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={
            servercanState.scienceState == "idle" ? connectScience : disconnectScience
          }
          variant="contained"
        >
          {servercanState.scienceState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
        </div>) : null }
        { isBaseConnected ? (
       <div>   
      {/* ANTENNA CAN CONNECTION */}
      <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
        <FormControl sx={{ flex: 1 }} size="small">
          <InputLabel id="antenna-dropdown-peripheral-id">ANTENNA</InputLabel>
          <Select
            value={basecanState.antennaId}
            label="ANTENNA"
            labelId="antenna-dropdown-peripheral-id"
            disabled={basecanState.loading || basecanState.antennaState != "idle"}
            onChange={(event) =>
              setbasecanState((prev) => ({
                ...prev,
                antennaId: event.target.value,
              }))
            }
            fullWidth
          >
            <MenuItem value={"disconnect"}>Disconnect</MenuItem>
            {basecanState.canIds?.map((canId) => (
              <MenuItem
                disabled={
                  canId === basecanState.GPSId
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
          color={basecanState.antennaState === "idle" ? "success" : "error"}
          disabled={basecanState.loading || basecanState.antennaId == "disconnect"}
          loading={basecanState.antennaState == "connecting"}
          sx={{ width: 50, minWidth: 0 }}
          onClick={
            basecanState.antennaState == "idle" ? connectScience : disconnectScience
          }
          variant="contained"
        >
          {servercanState.antennaState == "idle" ? (
            <ElectricalServicesIcon />
          ) : (
            <EjectIcon />
          )}
        </Button>
      </Box>
        </div>) : null }
    </div>
  );
}
