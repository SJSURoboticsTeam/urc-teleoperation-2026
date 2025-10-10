import { green } from "@mui/material/colors"
import { useState } from 'react';
import 'react-resizable/css/styles.css'; 
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Typography, Box, Slider, Grid, Button } from '@mui/material';

export default function ArmView ({track: controllerTrack, effector: controllerEffect, pitch: controllerPitch, roll: controllerRoll, shoulder: controllerShoulder, elbow: controllerElbow, armConnectedOne}) {
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
            {armConnectedOne==null?<>
            <Box sx={{ mt: 4 }}>
                <Typography sx={{textAlign:'center', mb: 2}} variant='h5'>Manual Controls</Typography>
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
                <Button sx={{ mt: 2, left:'50%', transform:'translateX(-50%)'}} variant="contained" onClick={handleManualUpdate}>Update</Button>
            </Box>
            </>:
            <Box sx={{ mt: 4 }}>
                <Box 
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        mb: 2
                    }}
                    >
                    <SportsEsportsIcon sx={{ color: green[500], fontSize: 60 }} />
                </Box>
                <Grid container spacing={2} sx={{ mt: 1, maxWidth: 500 }}>
                {[
                    { label: 'elbow', value: elbow },
                    { label: 'shoulder', value: shoulder },
                    { label: 'track', value: track },
                    { label: 'pitch', value: pitch },
                    { label: 'roll', value: roll },
                    { label: 'effector', value: effector }
                ].map(({ label, value }) => (
                    <Grid item xs={12} sm={6} key={label} sx={{textAlign:'center', border: '1px solid #ccc', borderRadius: 2, padding: 2, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <Typography gutterBottom sx={{textTransform: 'capitalize', width: 200 }}>{label}</Typography>
                    <Typography variant="h6">{value}</Typography>
                    </Grid>
                ))}
                </Grid>
            </Box>}
        </Box>
    );
}
