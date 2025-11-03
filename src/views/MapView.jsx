import 'react-resizable/css/styles.css' // keep global resizable styles if used elsewhere
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Map from '../components/drive/Map'
import { useState, useEffect } from 'react'
import { socket } from '../socket'

// Fullscreen map view — map should receive its full height from the parent Box
export default function FullscreenMap() {
    const [gps, setGPS] = useState({ latitude: null, longitude: null })

    useEffect(() => {
        function onGpsData(gpsData) {
            // console.log("lat:" + gpsData.latitude);
            // console.log("long:" + gpsData.longitude);
            setGPS({ latitude: gpsData.latitude, longitude: gpsData.longitude });
        }

        socket.on("gpsData", onGpsData);

        return () => {
            socket.off("gpsData", onGpsData);
        };
    }, []);

    // Let the parent (App) control the viewport height. Use flex:1 so Map fills available space.
    return (
        <Box component="main" sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <Map target={gps}/>
            <Card sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <CardContent>
                    <Typography variant="h6">Coordinates</Typography>
                    <Typography variant="body2">Lat: {gps.latitude} Long: {gps.longitude}</Typography>
                </CardContent>
            </Card>
        </Box>
    )
}