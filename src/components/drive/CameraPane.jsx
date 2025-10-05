import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import { useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from "@mui/material";

export default function CameraPane(){
    const [camera, setCamera] = useState('Test');

    const handleChange = (event) => {
    setCamera(event.target.value);
    };
    const cameras= [
    { value: 'Test', mediatype: "image", name: 'Test', url: '/lake.png'},
    { value: 'Mast Cam', mediatype: "image", name: 'Mast Cam', url: 'http://192.168.1.204:8081/'},
    { value: 'Under Chasis Cam', mediatype: "image", name: 'Under Chasis Cam', url: 'http://192.168.1.106:8081/'},
    { value: 'Drive Cam', mediatype: "video", name: 'Drive Cam', url: "http://192.168.1.114:8889/vision-720p/"},
    { value: 'Arm 1', mediatype: "video", name: 'Arm Base', url: "http://192.168.1.114:8889/one-720p"},
    { value: 'Arm 2', mediatype: "video", name: 'Arm Front', url: "http://192.168.1.114:8889/two-720p/"}
    ];

    const selectedCamera = cameras.find((cam) => cam.value == camera);
    return(
        // Root Box is flexible so CameraPane can grow inside a column
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1}}>
            <FormControl fullWidth sx={{ mb: 0.5, minHeight: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <InputLabel id="camera-select-label" sx={{ position: 'static', transform: 'none', mb: 0, fontSize: '0.875rem' }}>Camera</InputLabel>
                <Select
                    labelId="camera-select-label"
                    value={camera}
                    label="Camera"
                    onChange={handleChange}
                    size="small"
                    sx={{ py: 0, height: 32, fontSize: '0.9rem' }}
                    MenuProps={{
                        // Render menu in a portal so it isn't clipped by ancestor overflow
                        disablePortal: false,
                        // give the menu a high z-index so it appears above other elements
                        PaperProps: { sx: { zIndex: 3000 } },
                    }}
                >
                    {cameras.map((cam) => (
                        <MenuItem key={cam.value} value={cam.value}>
                            {cam.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* image container grows to fill remaining space */}
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                {selectedCamera && (
                    (selectedCamera.mediatype == "image")?
                    <img
                        src={selectedCamera.url}
                        alt={selectedCamera.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    :
                    <iframe
                        src={selectedCamera.url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        ></iframe> 
                )}
            </Box>
        </Box>
        
    );
}