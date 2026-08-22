import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { robotsocket, useRobotSocketStatus } from "../socket.io/socket";
import { useSerial } from "../../contexts/SerialContext";
import { usePeripherals } from "../../contexts/PeripheralContext";

export default function SerialConsole() {
  const serverConnected = useRobotSocketStatus;
  const {
    pulseDtr,
    updateDtr,
    updateRts,
    sendInput,
    closeConsole,
    openConsole,
    serialState,
    baudrate,
    refresh,
    autoScroll,
    outputRef,
    output,
    input,
    appendCarriageReturn,
    appendNewline,
    localEcho,
    selectedPort,
    setAppendNewline,
    setLocalEcho,
    setAutoScroll,
    setAppendCarriageReturn,
    busy,
    error,
    dtr,
    rts,
  } = useSerial();
  const { canState } = usePeripherals();
  return (
    <Paper
      sx={{
        m: 1,
        p: 2,
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Box>
          <Typography variant="h5">Serial Console</Typography>
        </Box>

        {!serverConnected && (
          <Alert severity="warning">Robot server offline</Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <FormControl size="small" sx={{ minWidth: 150, flex: 1 }}>
            <InputLabel>Server serial port</InputLabel>
            <Select
              value={selectedPort}
              label="Server serial port"
              disabled={serialState.connected || busy}
              onChange={(event) => setSelectedPort(event.target.value)}
            >
              <MenuItem value="disconnect">Select a port</MenuItem>
              {serialState.ports.map((portId) => (
                <MenuItem
                  key={portId}
                  disabled={
                    portId === canState.driveId ||
                    portId === canState.armId ||
                    portId === canState.scienceId ||
                    portId === canState.gpsId
                  }
                  value={portId}
                >
                  {portId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Baud rate"
            type="number"
            sx={{ width: 130 }}
            value={baudrate}
            disabled={serialState.connected || busy}
            onChange={(event) => setBaudrate(event.target.value)}
          />
          <Button variant="contained" onClick={refresh} disabled={busy}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color={serialState.connected ? "error" : "success"}
            disabled={busy || !serverConnected || selectedPort === "disconnect"}
            onClick={serialState.connected ? closeConsole : openConsole}
          >
            {serialState.connected ? "Disconnect" : "Connect"}
          </Button>
          <Button
            variant={autoScroll ? "contained" : "outlined"}
            color="secondary"
            sx={{ width: 180 }}
            aria-pressed={autoScroll}
            onClick={() => setAutoScroll((enabled) => !enabled)}
          >
            Autoscroll: {autoScroll ? "On" : "Off"}
          </Button>
        </Stack>

        <Box
          ref={outputRef}
          component="pre"
          sx={{
            bgcolor: "#101418",
            color: "#d7ffd9",
            p: 2,
            m: 0,
            flex: "1 1 0",
            height: { xs: 320, md: "50vh" },
            minHeight: 240,
            maxHeight: "60vh",
            overflow: "auto",
            borderRadius: 1,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            userSelect: "text",
            WebkitUserSelect: "text",
            cursor: "text",
          }}
        >
          {output || "Waiting for serial output…"}
        </Box>

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Console input"
            value={input}
            disabled={!serialState.connected}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendInput();
              }
            }}
          />
          <Button
            variant="contained"
            disabled={!serialState.connected}
            onClick={sendInput}
          >
            Send
          </Button>
          <Button variant="outlined" onClick={() => setOutput("")}>
            Clear
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <FormControlLabel
            control={
              <Checkbox
                checked={appendCarriageReturn}
                onChange={(event) =>
                  setAppendCarriageReturn(event.target.checked)
                }
              />
            }
            label="Append CR"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={appendNewline}
                onChange={(event) => setAppendNewline(event.target.checked)}
              />
            }
            label="Append LF"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={localEcho}
                onChange={(event) => setLocalEcho(event.target.checked)}
              />
            }
            label="Local echo"
          />
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems="center"
        >
          <Typography>DTR: {dtr ? "asserted" : "cleared"}</Typography>
          <Button
            disabled={!serialState.connected}
            onClick={() => updateDtr(true)}
          >
            Assert (ON)
          </Button>
          <Button
            disabled={!serialState.connected}
            onClick={() => updateDtr(false)}
          >
            Clear (OFF)
          </Button>
          <Button disabled={!serialState.connected} onClick={pulseDtr}>
            Pulse 200 ms (ON-OFF)
          </Button>
          <Typography>RTS: {rts ? "asserted" : "cleared"}</Typography>
          <Button
            disabled={!serialState.connected}
            onClick={() => updateRts(true)}
          >
            Assert RTS
          </Button>
          <Button
            disabled={!serialState.connected}
            onClick={() => updateRts(false)}
          >
            Clear RTS
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
