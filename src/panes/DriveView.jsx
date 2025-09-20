import 'react-resizable/css/styles.css' // Import default styles
import { createContext } from 'react';
import { useContext } from 'react';
import {useState, useEffect} from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { green } from "@mui/material/colors";
import GamepadDebug from '../components/GamepadDebug'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
//test
// In the future, it's one of these per view (drive, arm, science, etc)
const ThemeContext = createContext('null');
function DriveThemeContext(){

}

function DriveUi(){
    const [tolerance, setTolerance] = useState('0');
    const [sidewaysVelocity, setSidewaysVelocity] = useState('0');
    const [forwardsVelocity, setForwardVelocity] = useState('0');
    const [rotationalVelocity, setRotationalVelocity] = useState('0');
    const gamepads={}
    const [controllerno,setControllerno]=useState(0)
    const gamepadHandler = (event, connected) => {
        const gamepad = event.gamepad;
        if (connected) {
        gamepads[gamepad.index] = gamepad;
        } else {
        delete gamepads[gamepad.index];
        alert("you disconnected controller index "+gamepad.index);
        }
    };
    useEffect(()=>{
        if (controllerno>0)
        alert("Number of controllers currently connected:"+ controllerno);
    },[controllerno])
    useEffect(() => {
        const handleConnect = (e) => {
        setControllerno(prev => {return prev + 1;});
        gamepadHandler(e, true);
        };
    const handleDisconnect = (e) => {
        setControllerno(prev => {Math.max(prev - 1, 0)});
        gamepadHandler(e, false);
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
    }, []);
    const handleChange = (event) => {
        setTolerance(event.target.value);
    };
    return (
        <section>
            <Box
            sx={{ 
                display: "flex",
                flexDirection: "row",     
                gap: 4,
                p: 2,    
            }}>
                <Box
            sx={{ 
                display: "flex",
                flexDirection: "column",     
                gap: 4,
                p: 2,    
            }}
            >
            <div sx={{display: 'flex', justifyContent: "flex-start"}}>
                <TextField
                    label="tolerance field"
                    variant="outlined"
                    size="small"
                    value={tolerance}
                    onChange= {handleChange}
                />
            </div>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, marginTop: 2,}}>
            <Box
                sx={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                border: '2px solid #000000',
                width: '100px',
                height: '60px',
                borderRadius: 2,
                marginTop: 5,
                }}
            >
                <Typography variant="body1" sx={{marginTop: 10}}>{sidewaysVelocity}</Typography>
                <Typography variant="body2" sx={{ marginTop: 5}}>
                 sidewaysVel km/s
                </Typography>
            </Box>
            <Box
                sx={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                border: '2px solid #000000',
                width: '100px',
                height: '60px',
                borderRadius: 2,
                marginTop: 5,
                }}
            >
                <Typography variant="body1" sx={{marginTop: 10}}>{forwardsVelocity}</Typography>
                <Typography variant="body2" sx={{ marginTop: 5 }}>
                 forwardVel km/s
                </Typography>
            </Box>
            <Box
                sx={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                border: '2px solid #000000',
                width: '100px',
                height: '60px',
                borderRadius: 2,
                marginTop: 5,
                }}
            >
                <Typography variant="body1" sx={{marginTop: 10}}>{rotationalVelocity}</Typography>
                <Typography variant="body2"sx={{marginTop: 5}}>
                 rotationalVel rad/s
                </Typography>
            </Box>
            </Box>
                </Box>
            <Box>
            <Box
            sx={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                width: '350px',
                height: '200px',
                gap:4,
                p:2,
                }}>
                <SportsEsportsIcon sx={{color:controllerno>0?green[500]:"black", width:100,height:100}} id="gamepadicon"/> 
                {/* sx={{color:pink[500]}} */}
            </Box>
            <GamepadDebug></GamepadDebug>
            </Box>
            </Box>
        </section>
        );
    }

export default function DriveView (){
    return (
        <DriveUi />
    )
}
