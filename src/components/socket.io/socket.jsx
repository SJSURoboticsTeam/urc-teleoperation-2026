import { io } from "socket.io-client";
import { useState, useEffect } from "react";

// if prod use static IP, else use grab the ip of the current tab (ideal for local lan development that's not 127.0.0.1)
const robothost =
  import.meta.env.MODE === "production" || import.meta.env.MODE === "prod"
    ? "192.168.1.100"
    : window.location.hostname;

const basehost =
  import.meta.env.MODE === "production" || import.meta.env.MODE === "prod"
    ? "192.168.1.2"
    : window.location.hostname;

export const robotsocket = io(`http://${robothost}:4000`, {
  autoConnect: import.meta.env.MODE === "lite" ? false : true
  
});
export const basesocket = io(`http://${basehost}:4001`, {
  autoConnect: import.meta.env.MODE === "lite" ? false : true
});

export function useRobotSocketStatus() {
  const [isConnected, setIsConnected] = useState(robotsocket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    robotsocket.on("connect", onConnect);
    robotsocket.on("disconnect", onDisconnect);

    return () => {
      robotsocket.off("connect", onConnect);
      robotsocket.off("disconnect", onDisconnect);
    };
  }, []);

  return isConnected;
}

export function useBaseSocketStatus() {
  const [isConnected, setIsConnected] = useState(basesocket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    basesocket.on("connect", onConnect);
    basesocket.on("disconnect", onDisconnect);

    return () => {
      basesocket.off("connect", onConnect);
      basesocket.off("disconnect", onDisconnect);
    };
  }, []);

  return isConnected;
}
