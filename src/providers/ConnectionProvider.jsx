// Add by Sunny_100226

import { useEffect, useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";
import {
  basesocket,
  robotsocket,
} from "../components/socket.io/socket";
import { ConnectionContext } from "../contexts/ConnectionContext";

export default function ConnectionProvider({ children }) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  // Initialize state from the sockets' current connection status.
  const [robotConnected, setRobotConnected] = useState(
    robotsocket.connected,
  );
  const [baseConnected, setBaseConnected] = useState(
    basesocket.connected,
  );

  // Track whether each service has successfully connected before.
  const robotHasConnected = useRef(robotsocket.connected);
  const baseHasConnected = useRef(basesocket.connected);

  // Store Snackbar keys so warnings can be closed after reconnection.
  const robotSnackbarKey = useRef(null);
  const baseSnackbarKey = useRef(null);

  useEffect(() => {
    const handleRobotConnect = () => {
      setRobotConnected(true);
      robotHasConnected.current = true;

      // Remove the warning without showing a reconnect message.
      if (robotSnackbarKey.current !== null) {
        closeSnackbar(robotSnackbarKey.current);
        robotSnackbarKey.current = null;
      }
    };

    const handleRobotDisconnect = () => {
      setRobotConnected(false);

      // Warn only after an established connection is lost.
      if (
        robotHasConnected.current &&
        robotSnackbarKey.current === null
      ) {
        robotSnackbarKey.current = enqueueSnackbar(
          "Robot backend connection lost",
          {
            variant: "warning",
            persist: true,
            anchorOrigin: {
              vertical: "top",
              horizontal: "center",
            },
          },
        );
      }
    };

    const handleBaseConnect = () => {
      setBaseConnected(true);
      baseHasConnected.current = true;

      // Remove the warning without showing a reconnect message.
      if (baseSnackbarKey.current !== null) {
        closeSnackbar(baseSnackbarKey.current);
        baseSnackbarKey.current = null;
      }
    };

    const handleBaseDisconnect = () => {
      setBaseConnected(false);

      // Warn only after an established connection is lost.
      if (
        baseHasConnected.current &&
        baseSnackbarKey.current === null
      ) {
        baseSnackbarKey.current = enqueueSnackbar(
          "Base-pi connection lost",
          {
            variant: "warning",
            persist: true,
            anchorOrigin: {
              vertical: "top",
              horizontal: "center",
            },
          },
        );
      }
    };

    // Register all connection lifecycle listeners centrally.
    robotsocket.on("connect", handleRobotConnect);
    robotsocket.on("disconnect", handleRobotDisconnect);
    basesocket.on("connect", handleBaseConnect);
    basesocket.on("disconnect", handleBaseDisconnect);

    // Clean up listeners and active warnings when the provider unmounts.
    return () => {
      robotsocket.off("connect", handleRobotConnect);
      robotsocket.off("disconnect", handleRobotDisconnect);
      basesocket.off("connect", handleBaseConnect);
      basesocket.off("disconnect", handleBaseDisconnect);

      if (robotSnackbarKey.current !== null) {
        closeSnackbar(robotSnackbarKey.current);
        robotSnackbarKey.current = null;
      }

      if (baseSnackbarKey.current !== null) {
        closeSnackbar(baseSnackbarKey.current);
        baseSnackbarKey.current = null;
      }
    };
  }, [closeSnackbar, enqueueSnackbar]);

  // Share connection state with all child components.
  const value = useMemo(
    () => ({
      robotConnected,
      baseConnected,
    }),
    [robotConnected, baseConnected],
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
}