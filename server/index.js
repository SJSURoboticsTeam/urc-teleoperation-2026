import { Server } from "socket.io";
import {SerialPort} from 'serialport'
import { DelimiterParser } from '@serialport/parser-delimiter'
import { autoDetect } from '@serialport/bindings-cpp';


const ID = {
    SET_CHASSIS_VELOCITIES: '00C',
    SET_VELOCITIES_RESPONSE: '00D',
    HEARTBEAT: '00E',
    HEARTBEAT_REPLY: '00F',
    HOMING_SEQUENCE: '100',
    HOMING_SEQUENCE_RESPONSE: '111',
    GET_OFFSET: '112',
    RETURN_OFFSET: '113',
    GET_ESTIMATED_VELOCITIES: '114',
    RETURN_ESTIMATED_CHASSIS_VELOCITIES: '115',
    CONFIG: '119'
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
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

io.on('driveCommands', (driveCommands) => {
  if (!driveSerial.isOpen)
    return;

  let xVel = parseInt(driveCommands['xVel'],10).toString(16).slice(-4).padStart(4,'0')
  let yVel = parseInt(driveCommands['yVel'],10).toString(16).slice(-4).padStart(4,'0')
  let rotVel = parseInt(driveCommands['rotVel'],10).toString(16).slice(-4).padStart(4,'0')

  driveSerial.write(encoder.encode('t' + ID.SET_CHASSIS_VELOCITIES + '6' + vXvel + yVel + rotVel + '\r'))

})

io.on('driveHoming', ()=> {
  console.log('it do be')
  if (driveSerial.isOpen) {
    let command = 't' + ID.SET_CHASSIS_VELOCITIES + '80000000000000000\r'
    driveSerial.write(encoder.encode(command))
  }
})



const binding = autoDetect();
const devices = await binding.list();

const driveSerial = new SerialPort({
    path: devices[0].path,
    baudRate: 115200,
})

const encoder = new TextEncoder();
const decoder = new TextDecoder();

driveSerial.on('open', async ()=> {
    await driveSerial.set({dtr:false, rts:false})
    await sleep(200);
    await driveSerial.set({dtr:false, rts:true})
    await sleep(200);
    await driveSerial.set({dtr:false,rts:true})
    await sleep(200)
    await driveSerial.set({dtr:false,rts:false})
    await sleep(200);
    await driveSerial.write(encoder.encode('\r\r\r\r'))
    await sleep(200);
    await driveSerial.write(encoder.encode('V\r'))
    await sleep(200);
    await driveSerial.write(encoder.encode('S8\r'))
    await sleep(200);
    await driveSerial.write(encoder.encode('O\r'))
    await sleep(200);
})

const parser = driveSerial.pipe(new DelimiterParser({ delimiter: '\r', includeDelimiter: true }))

parser.on('data', (data) => {

    if (data.includes('\r')) {
        console.log(decoder.decode(data))
        parseCanMessage(data)
    }
})

function parseCanMessage(data) {
    let canID = decoder.decode(data.slice(1,4));
    console.log(canID)

    if (canID == ID.SET_VELOCITIES_RESPONSE) {

    }

    else if (canID == ID.HEARTBEAT_REPLY) {

    }

    else if (canID == ID.HOMING_SEQUENCE_RESPONSE) {

    }

    else if (canID == ID.RETURN_OFFSET) {

    }

    else if (canID == ID.RETURN_ESTIMATED_CHASSIS_VELOCITIES) {
        
    }
}
// latency check
io.on("connection", (socket) => {
  socket.on("pingCheck", (cb) => {
    cb(); // immediately respond
  });
    socket.on("getConnections", (cb) => {
    cb(connections);
  });
});

