import 'react-resizable/css/styles.css' // Import default styles
import { createContext } from 'react';
import { useContext } from 'react';
import {useState} from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { socket } from '../socket';

// In the future, it's one of these per view (drive, arm, science, etc)
const ThemeContext = createContext('null');
function DriveThemeContext(){

}
function DriveUi(){
    const [tolerance, setTolerance] = useState('0');
    const [sidewaysVelocity, setSidewaysVelocity] = useState('0');
    const [forwardsVelocity, setForwardVelocity] = useState('0');
    const [rotationalVelocity, setRotationalVelocity] = useState('0');

    userEffect(() => {
        // put xvel, yVel, rotVel into JSON and emit
        let driveCommands = {
            xVel: setSidewaysVelocity, 
            yVel: setForwardVelocity, 
            rotVel: setRotationalVelocity, 
        }    
        
        // call socket.emit; driveCanCommands will be defined
        // and emit
        socket.emit('Drive Commands', driveCommands)

    }, [tolerance, sidewaysVelocity, forwardsVelocity, rotationalVelocity])


    const handleChange = (event) => {
        setTolerance(event.target.value);
    };
    return (
        <section>
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
        </section>
        );
    }

export default function DriveView (){
    return (
        <DriveUi />
    )
}
