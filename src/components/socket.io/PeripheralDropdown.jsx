import { usePeripherals } from "../../contexts/PeripheralContext";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EjectIcon from "@mui/icons-material/Eject";

export default function PeripheralDropdown({ id, isRover = false }) {
  const {
    servercanState,
    basecanState,
    setservercanState,
    setbasecanState,
    connectRoverPeripheral,
    disconnectRoverPeripheral,
    connectBasePeripheral,
    disconnectBasePeripheral,
    isDuplicateRover,
  } = usePeripherals();

  const canState = isRover ? servercanState : basecanState;
  const setCanState = isRover ? setservercanState : setbasecanState;

  const connectPeripheral = isRover
    ? connectRoverPeripheral
    : connectBasePeripheral;
  const disconnectPeripheral = isRover
    ? disconnectRoverPeripheral
    : disconnectBasePeripheral;

  return (
    <Box key={id} sx={{ display: "flex", flexDirection: "row", gap: 1, mt: 1 }}>
      <FormControl sx={{ flex: 1 }} size="small">
        <InputLabel id={`${id}-dropdown-peripheral-id`}>
          {/* If drive define CAN or UART, if GPS say which backend*/}
          {/* Note duplication with below for label and InputLabel*/}
          {id === "drive" && isRover
            ? `${id.toUpperCase()} over ${servercanState.uartMode}`
            : id === "gps"
              ? isRover
                ? "ROVER"
                : "BASE"
              : id.toUpperCase()}
        </InputLabel>
        <Select
          value={canState[id].id}
          disabled={canState.loading || canState[id].state !== "idle"}
          label={
            id === "drive" && isRover
              ? `${id.toUpperCase()} over ${servercanState.uartMode}`
              : id === "gps"
                ? isRover
                  ? "ROVER"
                  : "BASE"
                : id.toUpperCase()
          }
          labelId={`${id}-dropdown-peripheral-id`}
          onChange={(event) =>
            setCanState((current) => ({
              ...current,
              [id]: {
                ...current[id],
                id: event.target.value,
              },
            }))
          }
          fullWidth
        >
          <MenuItem value={"disconnect"}>Disconnect</MenuItem>
          {canState.canIds?.map((canId) => (
            <MenuItem
              disabled={isRover && isDuplicateRover(id, canId)}
              key={canId}
              value={canId}
            >
              {canId}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {/* Button to connect/disconnect cpde*/}
      <Button
        color={canState[id].state === "idle" ? "success" : "error"}
        disabled={canState.loading || canState[id].id === "disconnect"}
        loading={canState[id].state === "connecting"}
        sx={{ width: 50, minWidth: 0 }}
        onClick={() =>
          canState[id].state === "idle"
            ? connectPeripheral(id)
            : disconnectPeripheral(id)
        }
        variant="contained"
      >
        {canState[id].state === "idle" ? (
          <ElectricalServicesIcon />
        ) : (
          <EjectIcon />
        )}
      </Button>
    </Box>
  );
}
