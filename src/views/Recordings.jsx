export default function RecordingsView () {
    
    return (
            
            <iframe 
                sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}
                style={{ height: "100vh" }}
                src="http://192.168.1.114:80" 
                title="Speed Test"
                allow="fullscreen; autoplay"
            ></iframe>
    )
}