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
        {value: 'camera 1', image:'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8MTYlM0E5fGVufDB8fDB8fHww', name:'camera 1'},
        {value: 'camera 2', image:'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8MTYlM0E5fGVufDB8fDB8fHww', name:'camera 2'}
    ];

    const selectedCamera = cameras.find((cam) => cam.value === camera);

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
                    <img
                        src={selectedCamera.image}
                        alt={selectedCamera.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                )}
            </Box>
        </Box>
    );
}