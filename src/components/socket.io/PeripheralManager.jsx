import { useEffect } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { usePeripherals } from "../../contexts/PeripheralContext";
import { useSerial } from "../../contexts/SerialContext";
import PeripheralDropdown from "./PeripheralDropdown";

// Read shared connection state from the centralized context
import { useConnectionStatus } from "../../contexts/ConnectionContext";

export default function PeripheralManager({ openPane }) {
  const {
    servercanState,
    basecanState,
    requestCanInfo,
    setservercanState,
    disconnectAll,
  } = usePeripherals();
  const { refresh } = useSerial();

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
            <PeripheralDropdown key={id} id={id} isRover />
          ))}
        </div>
      ) : null}
      {isBaseConnected ? (
        <div>
          {/* ANTENNA CAN CONNECTION */}
          <PeripheralDropdown id="antenna" />
        </div>
      ) : null}
    </div>
  );
}
