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

export default function PeripheralManager({ openPane }) {
  const {
    canState,
    requestCanInfo,
    setcanState,
    connectDrive,
    disconnectDrive,
    connectArm,
    disconnectArm,
    connectScience,
    disconnectScience,
    connectGPS,
    disconnectGPS,
    disconnectAll,
  } = usePeripherals();
  const { serialState, refresh } = useSerial();

  useEffect(() => {
    if (openPane == "Backend") {
      requestCanInfo(); // autoload can serialState
      refresh() // update serial
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
          <InputLabel id="drive-dropdown-peripheral-id">
            DRIVE over {canState.uartMode}
          </InputLabel>
          <Select
            value={canState.driveId}
            label={"DRIVE over " + canState.uartMode}
            labelId="drive-dropdown-peripheral-id"
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
                  canId === canState.gpsId ||
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
          <InputLabel id="arm-dropdown-peripheral-id">ARM</InputLabel>
          <Select
            value={canState.armId}
            label="ARM"
            labelId="arm-dropdown-peripheral-id"
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
                  canId === canState.gpsId ||
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
          <InputLabel id="science-dropdown-peripheral-id">SCIENCE</InputLabel>
          <Select
            value={canState.scienceId}
            label="SCIENCE"
            labelId="science-dropdown-peripheral-id"
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
                  canId === canState.gpsId ||
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
          <InputLabel id="gps-dropdown-peripheral-id">GPS</InputLabel>
          <Select
            value={canState.gpsId}
            label="GPS"
            labelId="gps-dropdown-peripheral-id"
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
                  canId === canState.scienceId ||
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
