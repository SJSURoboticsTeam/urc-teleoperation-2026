export default function SpeedTestView () {
    
    return (
            <iframe 
                sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}
                style={{ height: "100vh" }}
                src="http://192.168.1.114:3000" 
                title="Speed Test"
                allow="fullscreen; autoplay"
            ></iframe>
    )
}