import { useState, useEffect, useRef, useCallback } from "react";
import { robotsocket } from "../components/socket.io/socket";
import { SerialContext } from "../contexts/SerialContext";

export const SerialProvider = ({ children }) => {
  const decoderRef = useRef(new TextDecoder());
  const outputRef = useRef(null);

  const [serialState, setserialState] = useState({
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
  const [autoScroll, setAutoScroll] = useState(true);

  function applyInfo(nextInfo) {
    setserialState(nextInfo);
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
      const text = decoderRef.current.decode(decodeBytes(data), {
        stream: true,
      });
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
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

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
    const ending = `${appendCarriageReturn ? "\r" : ""}${appendNewline ? "\n" : ""}`;
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

  const value = {
    pulseDtr,
    updateDtr,
    updateRts,
    sendInput,
    closeConsole,
    openConsole,
    serialState,
    selectedPort,
    refresh,
    autoScroll,
    outputRef,
    setAppendNewline,
    baudrate,
    output,
    input,
    appendCarriageReturn,
    appendNewline,
    localEcho,
    setLocalEcho,
    setAutoScroll,
    setAppendCarriageReturn,
    busy,
    error,
    dtr,
    rts,
  };

  return (
    <SerialContext.Provider value={value}>{children}</SerialContext.Provider>
  );
};
export default SerialProvider;
