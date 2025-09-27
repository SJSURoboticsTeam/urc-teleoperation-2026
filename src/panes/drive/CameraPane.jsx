import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import { useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";

export default function CameraPane(){
    const [camera, setCamera] = useState('camera 1');

    const handleChange = (event) => {
    setCamera(event.target.value);
    };
    const cameras= [{value: 'camera 1', image:'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8MTYlM0E5fGVufDB8fDB8fHww', name:'camera 1'}, 
        {value: 'camera 2',image:'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8MTYlM0E5fGVufDB8fDB8fHww', name:'camera 2'}];

    const selectedCamera = cameras.find((cam) => cam.value == camera);
    return(
        <Box sx={{ minWidth: 120 , mb: 2, }}>
        <FormControl fullWidth>
            <Select
                labelId="camera-select-label"
                image="camera-select"
                value={camera}
                onChange={handleChange}
            >
                {cameras.map((cam) => (
                <MenuItem key={cam.value} value={cam.value}>
                {cam.name}
                </MenuItem>
                ))}
            </Select>
            {selectedCamera && (
                <img
                    src={selectedCamera.image}
                    alt={selectedCamera.name}
                    style={{ marginTop: "1rem", maxWidth: "100%" }}
                />
            )}
        </FormControl>
        </Box>
        
    );
}