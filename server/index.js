import { Server } from "socket.io";
import {SerialPort} from 'serialport'
import { ByteLengthParser } from '@serialport/parser-byte-length'
import { autoDetect } from '@serialport/bindings-cpp';


const ID = {
    STOP: 0x0E,
    HEARTBEAT: 0x0D,
    HEARTBEAT_REPLY: 0x0F,
    HOMING_SEQUENCE: 0x110,
    GET_OFFSET: 0x111,
    RETURN_OFFSET: 0x112,
    SET_TRANSLATION_VELOCITY: 0x113,
    SET_ROTATIONAL_VELOCITY: 0x114,
    SET_VELOCITY_RESPONSE: 0x115,
    GET_ESTIMATED_VELOCITY: 0x116,
    RETURN_ESTIMATED_VELOCITY: 0x117,
    RETURN_ESTIMATED_ROTATION: 0x118,
    CONFIG: 0x119
}



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

const binding = autoDetect();
const devices = await binding.list();

const rpiSerial = new SerialPort({
    path: devices[0].path,
    baudRate: 9600
})

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const parser = rpiSerial.pipe(new ByteLengthParser({length: 1}))
parser.on('data', (data) => {
    console.log(decoder.decode(data));
})

setInterval(() => {
    rpiSerial.write(encoder.encode("1"));
}, 1000)