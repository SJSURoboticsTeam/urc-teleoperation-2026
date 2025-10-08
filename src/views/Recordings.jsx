export default function SpeedTestView () {
    
    return (
            <iframe 
                style={{ width: "100vw", height: "100vh" }}
                src="http://192.168.1.114:3000" 
                title="Speed Test"
                allow="fullscreen; autoplay"
            ></iframe>
    )
}