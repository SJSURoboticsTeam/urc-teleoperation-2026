import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import { useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";

export default function CameraPane(){
    const [camera, setCamera] = useState('camera 1');

    const handleChange = (event) => {
    setCamera(event.target.value);
    };
    const cameras= [
    { value: 'Test', name: 'Test', url: 'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8MTYlM0E5fGVufDB8fDB8fHww'},
    { value: 'Mast Cam',name: 'Mast Cam', url: 'http://192.168.1.204:8081/'},
    { value: 'Under Chasis Cam', name: 'Under Chasis Cam', url: 'http://192.168.1.201:8081/'},
    { value: 'Front Left Cam', name: 'Front Left Cam', url: 'http://192.168.1.202:8081/'},
    { value: 'Front Right Cam', name: 'Front Right Cam', url: 'http://192.168.1.203:8081/'},
    { value: 'Drive Cam', name: 'Drive Cam', url: "http://192.168.1.114:8889/vision-720p/"}
    ];

    const selectedCamera = cameras.find((cam) => cam.value == camera);
    return(
        <Box sx={{ minWidth: 150, mb: 1, }}>
        <FormControl fullWidth>
            <Select
                labelId="camera-select-label"
                image="camera-select"
                value={camera}
                onChange={handleChange}
                sx={{ minWidth: 100, minHeight: 50 }}
            >
                {cameras.map((cam) => (
                <MenuItem key={cam.value} value={cam.value}>
                {cam.name}
                </MenuItem>
                ))}
            </Select>
            {selectedCamera && (
                <img
                    src={selectedCamera.url}
                    alt={selectedCamera.name}
                    style={{ marginTop: "1rem", maxWidth: "100%" }}
                />
            )}
        </FormControl>
        </Box>
        
    );
}