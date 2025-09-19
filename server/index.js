import { Server } from "socket.io";

const port = 4000;
var connections = 0;
const io = new Server({
  cors: {
    origin: true, // reflects request origin
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
    const ip = socket.handshake.address;
    // log connection with socket id and ip address
  console.log(`User connected: ${socket.id} at ${ip}`);
  connections++;
  socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`)
      connections--;
  });
});

io.listen(port, () => {
    console.log(`Server: http://localhost:${port}`)
})
// latency check
io.on("connection", (socket) => {
  socket.on("pingCheck", (cb) => {
    cb(); // immediately respond
  });
    socket.on("getConnections", (cb) => {
    cb(connections);
  });
});

