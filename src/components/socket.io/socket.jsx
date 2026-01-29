import { io } from 'socket.io-client'
import { useState, useEffect } from "react";

// if prod use static IP, else use grab the ip of the current tab (ideal for local lan development that's not 127.0.0.1)
const host =
  (import.meta.env.MODE === "production" || import.meta.env.MODE === "prod")
    ? "192.168.1.110"
    : window.location.hostname;

const URL = `http://${host}:4000`;
export const socket = io(URL);


export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return isConnected;
}



