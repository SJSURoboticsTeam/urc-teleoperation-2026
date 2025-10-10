import { Resizable, ResizableBox } from 'react-resizable';
import { useEffect, useState } from 'react';
import 'react-resizable/css/styles.css'; 
import { Typography, Box, Slider, Grid, TextField, Button } from '@mui/material';
import GamepadPanel from '../components/drive/GamepadPanel';

export default function ArmView ({velocities, armConnectedOne}) {
    const [elbow, setElbow] = useState(0);
    const [shoulder, setShoulder] = useState(0);
    const [track, setTrack] = useState(0);
    const [pitch, setPitch] = useState(0);
    const [roll, setRoll] = useState(0);
    const [effector, setEffector] = useState(0);


    const handleManualUpdate = () => {
        console.log("Manual positions:", { elbow, shoulder, track, pitch, roll, effector });
    };

    return (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', overflowY: 'auto' }}>
            <Typography variant='h4' sx={{ mb: 2 }}>Arm Control</Typography>
            <Typography variant='body1' sx={{ mb: 2 }}>Use Logitech gamepad to control the arm</Typography>
            <Box sx={{ mt: 4 }}>
                <Typography sx={{textAlign:'center'}} variant='h5'>Manual Controls</Typography>
                <Grid container spacing={2} sx={{ mt: 1, maxWidth: 500 }}>
                    {[
                        { label: 'Elbow', value: elbow, set: setElbow, max: 90 },
                        { label: 'Shoulder', value: shoulder, set: setShoulder, max: 110 },
                        { label: 'Track (cm)', value: track, set: setTrack, max: 45 },
                        { label: 'Pitch', value: pitch, set: setPitch, max: 150 },
                        { label: 'Roll', value: roll, set: setRoll, max: 360 },
                        { label: 'Effector (cm)', value: effector, set: setEffector, max: 20 }
                    ].map(({ label, value, set, max }) => (
                        <Grid item xs={12} sm={6} key={label} sx={{border: '1px solid #ccc', borderRadius: 2, padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography gutterBottom>{label}</Typography>
                            <Slider
                                value={value}
                                onChange={(_, v) => set(Number(v))}
                                min={0}
                                max={max}
                                step={1}
                                sx={{ width: 200 }}
                                valueLabelDisplay="auto"
                            />
                            <Typography variant="body2">{value}</Typography>
                        </Grid>
                    ))}
                </Grid>
                {armConnectedOne!=null?<div style={{textAlign:'center', marginTop: 25, fontSize: 20}}>Controller In Use</div>:<Button sx={{ mt: 2, left:'50%', transform:'translateX(-50%)'}} variant="contained" onClick={handleManualUpdate}>Update</Button>}
            </Box>
        </Box>
    );
}
