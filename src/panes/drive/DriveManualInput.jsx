import 'react-resizable/css/styles.css' // Import default styles
import { useEffect } from 'react';
import {useState} from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { socket } from '../../socket';
import Button from '@mui/material/Button';

// In the future, it's one of these per view (drive, arm, science, etc)}
function DriveUi(){
    const [sidewaysVelocity, setSidewaysVelocity] = useState('0');
    const [forwardsVelocity, setForwardVelocity] = useState('0');
    const [rotationalVelocity, setRotationalVelocity] = useState('0');
   
    // Sends drive commands to server
    useEffect(() => {
        let driveCommands = {
            xVel: sidewaysVelocity, 
            yVel: forwardsVelocity, 
            rotVel: rotationalVelocity, 
        }    
        socket.emit('driveCommands', driveCommands)

    }, [sidewaysVelocity, forwardsVelocity, rotationalVelocity])


    const handleClick= (event) => {
        socket.emit('driveHoming')
    };
    const velocities = [{id: sidewaysVelocity, name: "Sideways Velocity"}, 
                        {id: forwardsVelocity, name: "Forward Velocity"}, 
                        {id: rotationalVelocity, name: "Rotational Velocity"}];    
    return (
        <Box>
            <Button onclick ={handleClick}>
                Homing 
            </Button>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, marginTop: 2,}}>
                {velocities.map((velocity) => (
                    <Box
                        sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        alignItems: 'center',
                        border: '2px solid #000000',
                        width: '75px',
                        height: '50px',
                        borderRadius: 2,
                        marginTop: 5,
                        }}
                    >
                        <Typography variant="body1" sx={{marginTop: 10}}>{velocity.id}</Typography>
                        <Typography variant="body2" sx={{ marginTop: 5}}>
                         {velocity.name} 
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
        );
    }

export default function DriveView (){
    return (
        <DriveUi />
    )
}
