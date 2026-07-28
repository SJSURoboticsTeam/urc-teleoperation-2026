import { useCallback, useEffect, useRef, useState } from "react";
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

const textEncoder = new TextEncoder();

function encodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBytes(encoded) {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export default function SerialConsole() {
  const serverConnected = useRobotSocketStatus();
  const decoderRef = useRef(new TextDecoder());
  const outputRef = useRef(null);
  const [info, setInfo] = useState({
    ports: [],
    portId: "disconnect",
    baudrate: 115200,
    connected: false,
    dtr: false,
    rts: false,
  });
  const [selectedPort, setSelectedPort] = useState("disconnect");
  const [baudrate, setBaudrate] = useState(115200);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dtr, setDtr] = useState(false);
  const [rts, setRts] = useState(false);
  const [appendCarriageReturn, setAppendCarriageReturn] = useState(false);
  const [appendNewline, setAppendNewline] = useState(true);
  const [localEcho, setLocalEcho] = useState(false);

  function applyInfo(nextInfo) {
    setInfo(nextInfo);
    setSelectedPort(nextInfo.portId);
    setBaudrate(nextInfo.baudrate);
    setDtr(nextInfo.dtr ?? false);
    setRts(nextInfo.rts ?? false);
  }

  const refresh = useCallback(() => {
    robotsocket.emit("getSerialConsoleInfo", (response) => {
      if (response) applyInfo(response);
    });
  }, []);

  useEffect(() => {
    const handleData = ({ data }) => {
      const text = decoderRef.current.decode(decodeBytes(data), { stream: true });
      setOutput((previous) => (previous + text).slice(-100_000));
    };
    const handleStatus = (status) => applyInfo(status);
    const handleError = ({ message }) => setError(message);

    robotsocket.on("serialConsoleData", handleData);
    robotsocket.on("serialConsoleStatus", handleStatus);
    robotsocket.on("serialConsoleError", handleError);
    refresh();

    return () => {
      robotsocket.off("serialConsoleData", handleData);
      robotsocket.off("serialConsoleStatus", handleStatus);
      robotsocket.off("serialConsoleError", handleError);
    };
  }, [refresh]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  function openConsole() {
    setBusy(true);
    setError("");
    robotsocket.emit(
      "openSerialConsole",
      { portId: selectedPort, baudrate: Number(baudrate) },
      (response) => {
        setBusy(false);
        if (response?.status !== "OK") {
          setError(response?.message || "Unable to open serial console");
        } else {
          refresh();
        }
      },
    );
  }

  function closeConsole() {
    setBusy(true);
    robotsocket.emit("closeSerialConsole", (response) => {
      setBusy(false);
      if (response?.status !== "OK") {
        setError(response?.message || "Unable to close serial console");
      }
    });
  }

  function sendInput() {
    if (!input) return;
    const ending =
      `${appendCarriageReturn ? "\r" : ""}${appendNewline ? "\n" : ""}`;
    const payload = textEncoder.encode(`${input}${ending}`);
    robotsocket.emit(
      "writeSerialConsole",
      { data: encodeBytes(payload) },
      (response) => {
        if (response?.status !== "OK") {
          setError(response?.message || "Serial write failed");
        }
      },
    );
    if (localEcho) {
      setOutput((previous) => (previous + input + ending).slice(-100_000));
    }
    setInput("");
  }

  function updateRts(enabled) {
    robotsocket.emit("setSerialConsoleRts", { enabled }, (response) => {
      if (response?.status === "OK") {
        setRts(enabled);
      } else {
        setError(response?.message || "Unable to set RTS");
      }
    });
  }

  function updateDtr(enabled) {
    robotsocket.emit("setSerialConsoleDtr", { enabled }, (response) => {
      if (response?.status === "OK") {
        setDtr(enabled);
      } else {
        setError(response?.message || "Unable to set DTR");
      }
    });
  }

  function pulseDtr() {
    robotsocket.emit(
      "pulseSerialConsoleDtr",
      { durationMs: 200 },
      (response) => {
        if (response?.status === "OK") {
          setDtr(true);
        } else {
          setError(response?.message || "Unable to pulse DTR");
        }
      },
    );
  }

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

        {!serverConnected && <Alert severity="warning">Robot server offline</Alert>}
        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>Server serial port</InputLabel>
            <Select
              value={selectedPort}
              label="Server serial port"
              disabled={info.connected || busy}
              onChange={(event) => setSelectedPort(event.target.value)}
            >
              <MenuItem value="disconnect">Select a port</MenuItem>
              {info.ports.map((portId) => (
                <MenuItem key={portId} value={portId}>
                  {portId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Baud rate"
            type="number"
            value={baudrate}
            disabled={info.connected || busy}
            onChange={(event) => setBaudrate(event.target.value)}
          />
          <Button variant="outlined" onClick={refresh} disabled={busy}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color={info.connected ? "error" : "success"}
            disabled={
              busy || !serverConnected || selectedPort === "disconnect"
            }
            onClick={info.connected ? closeConsole : openConsole}
          >
            {info.connected ? "Disconnect" : "Connect"}
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
            disabled={!info.connected}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendInput();
              }
            }}
          />
          <Button variant="contained" disabled={!info.connected} onClick={sendInput}>
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
                onChange={(event) => setAppendCarriageReturn(event.target.checked)}
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

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
          <Typography>DTR: {dtr ? "asserted" : "cleared"}</Typography>
          <Button disabled={!info.connected} onClick={() => updateDtr(true)}>
            Assert (ON)
          </Button>
          <Button disabled={!info.connected} onClick={() => updateDtr(false)}>
            Clear (OFF)
          </Button>
          <Button disabled={!info.connected} onClick={pulseDtr}>
            Pulse 200 ms (ON-OFF)
          </Button>
          <Typography>RTS: {rts ? "asserted" : "cleared"}</Typography>
          <Button disabled={!info.connected} onClick={() => updateRts(true)}>
            Assert RTS
          </Button>
          <Button disabled={!info.connected} onClick={() => updateRts(false)}>
            Clear RTS
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
