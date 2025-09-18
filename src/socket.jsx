import { io } from 'socket.io-client'

// "undefined" means the URL will be computed from the `window.location` object
const host =
  import.meta.env.MODE === "production"
    ? "192.168.1.100"
    : window.location.hostname;

const URL = `http://${host}:4000`;

export const socket = io(URL);