import { io } from "socket.io-client";

// if prod use static IP, else use grab the ip of the current tab (ideal for local lan development that's not 127.0.0.1)
const robothost =
  import.meta.env.MODE === "prod"
    ? "192.168.1.49"
    : window.location.hostname;

const basehost =
  import.meta.env.MODE === "prod"
    ? "192.168.1.2"
    : window.location.hostname;


// Create shared Socket.IO clients for the robot and base-pi services.
export const robotsocket = io(`http://${robothost}:4000`, {
  autoConnect: import.meta.env.MODE !== "lite" && import.meta.env.MODE !== "demo",
});
export const basesocket = io(`http://${basehost}:4001`, {
  autoConnect: import.meta.env.MODE !== "lite" && import.meta.env.MODE !== "demo",
});