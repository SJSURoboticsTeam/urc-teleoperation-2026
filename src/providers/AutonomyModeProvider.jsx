// Provider wrapper used at the app level
import { AutonomyModeContext } from "../contexts/AutonomyModeContext";
import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { robotsocket } from "../components/socket.io/socket";

// Import in App.jsx and wrap around components that need access to it
export default function AutonomyModeProvider({ children }) {
  const { enqueueSnackbar } = useSnackbar();
  // null until the rover backend sends its state, and while disconnected
  const [autonomyState, setAutonomyState] = useState(null);

  useEffect(() => {
    // Server is the single source of truth: every client syncs from this broadcast
    const pullState = () => {
      robotsocket.emit("getAutonomyState", setAutonomyState);
    };
    const onDisconnect = () => setAutonomyState(null);

    robotsocket.on("autonomyState", setAutonomyState);
    robotsocket.on("connect", pullState);
    robotsocket.on("disconnect", onDisconnect);

    // cover the case where the socket connected before this effect ran
    if (robotsocket.connected) {
      pullState();
    }

    return () => {
      robotsocket.off("autonomyState", setAutonomyState);
      robotsocket.off("connect", pullState);
      robotsocket.off("disconnect", onDisconnect);
    };
  }, []);

  // Sends an autonomy event and shows the reason if the rover refuses it
  // memoized so effects that depend on it don't re-run every render
  const sendAutonomyCommand = useCallback((event, data) => {
    const args = data === undefined ? [] : [data];
    robotsocket.timeout(3000).emit(event, ...args, (err, res) => {
      if (err) {
        enqueueSnackbar(`${event} timed out.`, { variant: "error" });
        return;
      }
      if (res.status !== "OK") {
        enqueueSnackbar(res.reason || `${event} failed.`, {
          variant: res.status === "DENIED" ? "warning" : "error",
        });
      }
    });
  }, [enqueueSnackbar]);

  const autonomyEnabled = autonomyState?.mode === "AUTONOMY";

  return (
    <AutonomyModeContext.Provider
      value={{ autonomyState, autonomyEnabled, sendAutonomyCommand }}
    >
      {children}
    </AutonomyModeContext.Provider>
  );
}
