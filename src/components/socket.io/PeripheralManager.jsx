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
    connectRoverPeripheral,
    disconnectRoverPeripheral,
    disconnectAll,
  } = usePeripherals();
  const { serialState, refresh } = useSerial();

  const MappedValues = ["drive", "arm", "science"];

  const { robotConnected: isRobotConnected, baseConnected: isBaseConnected } =
    useConnectionStatus();

  useEffect(() => {
    if (openPane == "Backend") {
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
            servercanState.drive.state != "active" &&
            servercanState.arm.state != "active" &&
            servercanState.science.state != "active" &&
            basecanState.antenna.state != "active"
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
      {isRobotConnected ? (
        <div>
          {/* DRIVE, ARM, SCIENCE CONNECTION */}
          {MappedValues.map((id) => (
            <Box
              key={id}
              sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}
            >
              <FormControl sx={{ flex: 1 }} size="small">
                <InputLabel id={id + "-dropdown-peripheral-id"}>
                  {id == "drive" ? id.toUpperCase() + " over " + servercanState.uartMode : id.toUpperCase()}
                </InputLabel>
                <Select
                  value={servercanState[id]["id"]}
                  label={
                    id == "drive" ? id.toUpperCase() + " over" + servercanState.uartMode : id.toUpperCase()
                  }
                  labelId={id + "dropdown-peripheral-id"}
                  disabled={
                    servercanState.loading ||
                    servercanState[id]["state"] != "idle"
                  }
                  onChange={(event) =>
                    setservercanState((current) => ({
                      ...current,
                      [id]: {
                        ...current.id,
                        id: event.target.value,
                      },
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value={"disconnect"}>Disconnect</MenuItem>
                  {servercanState.canIds?.map((canId) => (
                    <MenuItem
                      disabled={
                        canId === servercanState.arm.id ||
                        canId === servercanState.science.id ||
                        canId === servercanState.gps.id ||
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
                color={
                  servercanState[id]["state"] === "idle" ? "success" : "error"
                }
                disabled={
                  servercanState.loading ||
                  servercanState[id]["id"] == "disconnect"
                }
                loading={servercanState[id]["state"] == "connecting"}
                sx={{ width: 50, minWidth: 0 }}
                onClick={() =>
                  servercanState[id].state === "idle"
                    ? connectRoverPeripheral(id)
                    : disconnectRoverPeripheral(id)
                }
                variant="contained"
              >
                {servercanState[id]["state"] == "idle" ? (
                  <ElectricalServicesIcon />
                ) : (
                  <EjectIcon />
                )}
              </Button>
            </Box>
          ))}
        </div>
      ) : null}
      {isBaseConnected ? (
        <div>
          {/* ANTENNA CAN CONNECTION */}
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
            <FormControl sx={{ flex: 1 }} size="small">
              <InputLabel id="antenna-dropdown-peripheral-id">
                ANTENNA
              </InputLabel>
              <Select
                value={basecanState.antenna.id}
                label="ANTENNA"
                labelId="antenna-dropdown-peripheral-id"
                disabled={
                  basecanState.loading || basecanState.antenna.state != "idle"
                }
                  onChange={(event) =>
                    setbasecanState((current) => ({
                      ...current,
                      antenna: {
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
                    disabled={canId === basecanState.gps.id}
                    key={canId}
                    value={canId}
                  >
                    {canId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              color={
                basecanState.antenna.state === "idle" ? "success" : "error"
              }
              disabled={
                basecanState.loading || basecanState.antenna.id == "disconnect"
              }
              loading={basecanState.antenna.state == "connecting"}
              sx={{ width: 50, minWidth: 0 }}
              // onClick={
              //   basecanState.antennaState == "idle"
              //     ? connectScience
              //     : disconnectScience
              // }
              variant="contained"
            >
              {basecanState.antenna.state == "idle" ? (
                <ElectricalServicesIcon />
              ) : (
                <EjectIcon />
              )}
            </Button>
          </Box>
        </div>
      ) : null}
    </div>
  );
}
