import { Server } from "socket.io";
import {SerialPort} from 'serialport'
import { DelimiterParser } from '@serialport/parser-delimiter'
import { autoDetect } from '@serialport/bindings-cpp';


const ID = {
    SET_CHASSIS_VELOCITIES: 0X0C,
    SET_VELOCITIES_RESPONSE: 0x0D,
    HEARTBEAT: 0x0E,
    HEARTBEAT_REPLY: 0X0F,
    HOMING_SEQUENCE: 0X100,
    HOMING_SEQUENCE_RESPONSE: 0x111,
    GET_OFFSET: 0X112,
    RETURN_OFFSET: 0X113,
    GET_ESTIMATED_VELOCITIES: 0X114,
    RETURN_ESTIMATED_CHASSIS_VELOCITIES: 0X115,
    CONFIG: 0X119
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    baudRate: 115200,
})

const encoder = new TextEncoder();
const decoder = new TextDecoder();

rpiSerial.on('open', async ()=> {
    await rpiSerial.set({dtr:false, rts:false})
    await sleep(200);
    await rpiSerial.set({dtr:false, rts:true})
    await sleep(200);
    await rpiSerial.set({dtr:false,rts:true})
    await sleep(200)
    await rpiSerial.set({dtr:false,rts:false})
    await sleep(200);
    await rpiSerial.write(encoder.encode('\r\r\r\r'))
    await sleep(200);
    await rpiSerial.write(encoder.encode('V\r'))
    await sleep(200);
    await rpiSerial.write(encoder.encode('S8\r'))
    await sleep(200);
    await rpiSerial.write(encoder.encode('O\r'))
    await sleep(200);
})

const parser = rpiSerial.pipe(new DelimiterParser({ delimiter: '\r', includeDelimiter: true }))

parser.on('data', (data) => {

    if (data.byteLength != 22) {
        console.log("Potentially bad data\n")
        console.log(decoder.decode(data))
    }

    if (data.includes('\r')) {
        console.log(decoder.decode(data))
        parseCanMessage(data)
    }
})

function parseCanMessage(data) {
    const canID = data[1] << 16 | data[2] << 8 | data[3];

    if (canID = ID.SET_VELOCITIES_RESPONSE) {

    }

    else if (canID = ID.HEARTBEAT_REPLY) {

    }

    else if (canID = ID.HOMING_SEQUENCE_RESPONSE) {

    }

    else if (canID = ID.RETURN_OFFSET) {

    }

    else if (canID = ID.RETURN_ESTIMATED_CHASSIS_VELOCITIES) {
        
    }
}