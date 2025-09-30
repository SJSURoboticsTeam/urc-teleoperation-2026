import { Resizable, ResizableBox } from 'react-resizable';
import { useEffect, useState } from 'react';
import 'react-resizable/css/styles.css' // Import default styles
import { Typography, Box } from '@mui/material';
import Gamepad from '../components/drive/Gamepad';
// Import list of components, in index.jsx? 
// or do I handpick the components I want 

// In the future, it's one of these per view (drive, arm, science, etc)
export default function ArmView () {
    const [gamepads,setGamepads]=useState({})
    let armMapping = {
    joystickVertical: 1,
    thumbJoystickVertical: 9,
    thumbUp: -1,
    thumbDown: 0.14285719394683838,
    joystickRotate: 5,
    joystickTrigger: 0,
    rudder: 6,
    button3: 2,
    button4: 3,
    button5: 4,
    button6: 5,
    }
    function gamepadHandler(event, connected) {
        const gamepad=event.gamepad;
        const regex=/EXTREME/i;
        if (connected) {
            if (regex.test(gamepad.id)) {
                setGamepads({...gamepads,[gamepad.index]:gamepad})
                alert('added controller index '+gamepad.index);
            }
        }
    }
    useEffect(()=>{
        const handleConnect = (e) => {
            gamepadHandler(e,true);
        }
        const handleDisconnect = (e) => {
            gamepadHandler(e,false);
        }
        window.addEventListener("gamepadconnected", handleConnect);
        window.addEventListener("gamepaddisconnected", handleDisconnect);
        return () => {
            window.removeEventListener("gamepadconnected", handleConnect);
            window.removeEventListener("gamepaddisconnected", handleDisconnect);
        }
    },[])
    return (
        <Box>
            <Typography variant='h4' sx={{mb:2}}>Arm Control</Typography>
            <Typography variant='body1' sx={{mb:2}}>Use Logitech gamepad to control the arm</Typography>
            <Gamepad onVelocitiesChange={(vel)=>{console.log(vel.ly+' '+vel.lx+ ' '+vel.rx)}} gamepads={gamepads}></Gamepad>
        </Box>
    )
}