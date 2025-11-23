import { io } from 'socket.io-client'

// if prod use static IP, else use grab the ip of the current tab (ideal for local lan development that's not 127.0.0.1)
const host =
  (import.meta.env.MODE === "production" || import.meta.env.MODE === "prod")
    ? "192.168.1.114"
    : window.location.hostname;

const URL = `http://${host}:4000`;

export const socket = io(URL, {
  transports: ["websocket"],   // ← skip polling entirely
  upgrade: false,              // optional: disable fallback logic
});