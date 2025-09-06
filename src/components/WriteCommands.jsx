//Import commands from Configs.jsx (old)
import { socket } from "../socket";

export default function writeCommands() {
    try {
            let canCommands = []
            let armCan = armToCan(commands.arm) //Not yet made
            armCan.forEach(element => {
                canCommands.push(element)
            });
            let driveCan = driveToCan(commands.drive)
            driveCan.forEach(element => {
                canCommands.push(element)
            })
            
            socket.emit('post commands', canCommands)

        } catch (error) {
            disconnect()
            console.log(error)
            console.log("Unable to post commands, verify backend is running")
        }
    
    useEffect(() => {
        const writeInterval = setInterval(() => {
            if (isConnected) {
                writeCommands()
            }
        }, 200)
        return () => clearInterval(writeInterval)
    }, [isConnected, commands])
}
