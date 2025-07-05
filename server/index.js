import { Server } from "socket.io";

const port = 4000;
const io = new Server({
    cors: {
        origin: "http://localhost:5173" // Allows requests from React app
    },
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`)
    });
});

io.listen(port, () => {
    console.log(`Server: http://localhost:${port}`)
})