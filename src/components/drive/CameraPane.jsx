import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import { useState, useEffect, useRef } from 'react';
import { Select, MenuItem, FormControl, InputLabel, CircularProgress, Typography, Button } from "@mui/material";

export default function CameraPane(){
    const [camera, setCamera] = useState('Test');

    const handleChange = (event) => {
    setCamera(event.target.value);
    };
    const cameras= [
    { value: 'Test', mediatype: "image", name: 'Test', url: '/mars.jpg'},
    { value: 'Mast Cam', mediatype: "image", name: 'Mast Cam', url: 'http://192.168.1.204:8081/'},
    { value: 'Under Chasis Cam', mediatype: "image", name: 'Under Chasis Cam', url: 'http://192.168.1.106:8081/'},
    { value: 'Drive Cam', mediatype: "video", name: 'Drive Cam', url: "http://192.168.1.114:8889/vision-720p/"},
    { value: 'Arm 1', mediatype: "video", name: 'Arm Base', url: "http://192.168.1.114:8889/one-720p"},
    { value: 'Arm 2', mediatype: "video", name: 'Arm Front', url: "http://192.168.1.114:8889/two-720p/"}
    ];

    const selectedCamera = cameras.find((cam) => cam.value == camera);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const iframeTimeoutRef = useRef(null);

    // derive simple deps for the effect so lint can verify
    const selectedUrl = selectedCamera?.url ?? null;
    const selectedMediaType = selectedCamera?.mediatype ?? null;

    // whenever camera changes, reset loading/error
    useEffect(() => {
        setLoading(true);
        setError(false);
        // clear any previous iframe timeout
        if (iframeTimeoutRef.current) {
            clearTimeout(iframeTimeoutRef.current);
            iframeTimeoutRef.current = null;
        }
        // if selectedCamera is iframe/video, start a timeout to mark error if not loaded
        if (selectedMediaType === 'video') {
            // for video/iframe style streams, give them up to 10s to load
            iframeTimeoutRef.current = setTimeout(() => {
                setLoading(false);
                setError(true);
            }, 5000);
        }
        // for images, onLoad handler will clear loading
        return () => {
            if (iframeTimeoutRef.current) {
                clearTimeout(iframeTimeoutRef.current);
                iframeTimeoutRef.current = null;
            }
        };
    }, [selectedUrl, selectedMediaType]);
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
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                {selectedCamera && (
                    (selectedCamera.mediatype == "image") ?
                        <img
                            key={selectedCamera.url}
                            src={selectedCamera.url}
                            alt={selectedCamera.name}
                            onLoad={() => { setLoading(false); setError(false); }}
                            onError={() => { setLoading(false); setError(true); }}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                    :
                        <iframe
                            key={selectedCamera.url}
                            src={selectedCamera.url}
                            onLoad={() => { if (iframeTimeoutRef.current) { clearTimeout(iframeTimeoutRef.current); iframeTimeoutRef.current = null; } setLoading(false); setError(false); }}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
                            title={selectedCamera.name}
                        />
                )}

                {/* loading / error overlays */}
                {loading && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                        <CircularProgress color="inherit" />
                    </Box>
                )}

                {error && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                        <Typography color="error">Failed to load camera</Typography>
                        <Button sx={{ mt: 1 }} variant="contained" onClick={() => { setLoading(true); setError(false); /* force reload by changing key: handled by key prop */ }}>Retry</Button>
                    </Box>
                )}
            </Box>
        </Box>
        
    );
}