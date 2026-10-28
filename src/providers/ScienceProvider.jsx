import { useState, useEffect } from "react";
import { useSnackbar } from "notistack";
import { robotsocket } from "../components/socket.io/socket";
import { ScienceContext } from "../contexts/ScienceContext";
import { demoScienceSession } from "../components/science/demoScienceSession";

// lite/demo modes have no backend: show a static snapshot and disable commands
const offlineMode =
  import.meta.env.MODE === "lite" || import.meta.env.MODE === "demo";

export const ScienceProvider = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  // null until the first snapshot arrives. The backend owns all of this
  const [session, setSession] = useState(offlineMode ? demoScienceSession : null);
  const [connected, setConnected] = useState(robotsocket.connected);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const pullScienceSession = () => {
      robotsocket.timeout(3000).emit("getScienceSession", (err, data) => {
        if (!err && data) setSession(data);
      });
    };

    const onScienceSession = (data) => {
      setSession(data);
    };

    const onConnect = () => {
      setConnected(true);
      pullScienceSession();
    };

    // keep the last snapshot on screen; the view marks it stale
    const onDisconnect = () => {
      setConnected(false);
      setPending(false);
    };

    robotsocket.on("scienceSession", onScienceSession);
    robotsocket.on("connect", onConnect);
    robotsocket.on("disconnect", onDisconnect);

    // cover the case where the socket connected before this effect ran
    if (robotsocket.connected) {
      onConnect();
    }

    return () => {
      robotsocket.off("scienceSession", onScienceSession);
      robotsocket.off("connect", onConnect);
      robotsocket.off("disconnect", onDisconnect);
    };
  }, []);

  const canCommand = !offlineMode && connected;
  const stale = !offlineMode && !connected && session !== null;

  // The reply only says whether the command was accepted; the new state arrives
  // via the scienceSession broadcast, never from here
  const sendCommand = (event, payload, label, { bypassPending = false } = {}) => {
    if (!canCommand) {
      enqueueSnackbar("Science backend not connected.", { variant: "error" });
      return;
    }
    if (!bypassPending) {
      if (pending) return;
      setPending(true);
    }
    robotsocket.timeout(3000).emit(event, payload, (err, res) => {
      if (!bypassPending) setPending(false);
      if (err) {
        enqueueSnackbar(`${label} timed out.`, { variant: "error" });
        return;
      }
      if (res?.status === "DENIED") {
        enqueueSnackbar(res.reason || `${label} denied.`, { variant: "warning" });
      } else if (res?.status === "ERROR") {
        enqueueSnackbar(res.reason || `${label} failed.`, { variant: "error" });
      }
    });
  };

  const startSite = (site) =>
    sendCommand("scienceStartSite", { site }, "Start site");

  const step = (site) => sendCommand("scienceStep", { site }, "Step");

  // E-stop must never wait behind another command, so it skips the pending guard
  const stop = () =>
    sendCommand("scienceStop", {}, "Science E-Stop", { bypassPending: true });

  // clears the stop latch only; the UI never wipes a single site
  const reset = () => sendCommand("scienceReset", {}, "Clear Science E-Stop");

  const value = {
    session,
    offlineMode,
    connected,
    canCommand,
    stale,
    pending,
    startSite,
    step,
    stop,
    reset,
  };

  return (
    <ScienceContext.Provider value={value}>{children}</ScienceContext.Provider>
  );
};

export default ScienceProvider;
