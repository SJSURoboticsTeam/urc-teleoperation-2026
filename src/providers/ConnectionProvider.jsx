// Add by Sunny_100226

import { useEffect, useMemo, useState } from "react";
import {
  basesocket,
  robotsocket,
} from "../components/socket.io/socket";
import { ConnectionContext } from "../contexts/ConnectionContext";

export default function ConnectionProvider({ children }) {
  // Initialize state from the sockets' current connection status.  
  const [robotConnected, setRobotConnected] = useState(
    robotsocket.connected,
  );

  const [baseConnected, setBaseConnected] = useState(
    basesocket.connected,
  );

  useEffect(() => {
    // Update robot backend status when its connection changes.
    const handleRobotConnect = () => {
      setRobotConnected(true);
    };

    const handleRobotDisconnect = () => {
      setRobotConnected(false);
    };

    // Update base-pi status when its connection changes.
    const handleBaseConnect = () => {
      setBaseConnected(true);
    };

    const handleBaseDisconnect = () => {
      setBaseConnected(false);
    };

    // Register connection listeners in one shared provider.
    robotsocket.on("connect", handleRobotConnect);
    robotsocket.on("disconnect", handleRobotDisconnect);

    basesocket.on("connect", handleBaseConnect);
    basesocket.on("disconnect", handleBaseDisconnect);

    // Remove listeners when the provider is unmounted.
    return () => {
      robotsocket.off("connect", handleRobotConnect);
      robotsocket.off("disconnect", handleRobotDisconnect);

      basesocket.off("connect", handleBaseConnect);
      basesocket.off("disconnect", handleBaseDisconnect);
    };
  }, []);

  // Share both connection states with all child components.
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