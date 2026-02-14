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

// set of listeners for client command notifications
const _cmdListeners = new Set();

// trigger notifications to any listeners whenever a client command is sent via socket.emit
export function notifyClientCommandSent(info = {}) {
  _cmdListeners.forEach((cb) => {
    try { cb(info); } catch (e) { console.warn(e); }
  });
}

// add a listener for client command notifications
export function onClientCommandSent(cb) {
  _cmdListeners.add(cb);
  // return a function to remove the listener
  return () => _cmdListeners.delete(cb);
}

// automatically notify whenever any client command is sent via socket.emit
const originalEmit = socket.emit.bind(socket);

// list of events that are considered "client commands" that are tracked for health monitoring
const COMMAND_EVENTS = new Set([
  "driveCommands",
  "panCommands",
  "driveHoming",
  "armCommands",
]);

socket.emit = (event, ...args) => {
  // if this is a known client command event, trigger notifications to any listeners
  if (COMMAND_EVENTS.has(event)) {
    notifyClientCommandSent({ type: event });
  }
  // otherwise, just call the original emit function
  return originalEmit(event, ...args);
};
