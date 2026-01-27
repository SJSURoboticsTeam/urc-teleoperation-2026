import "react-resizable/css/styles.css"; // keep global resizable styles if used elsewhere
import Box from "@mui/material/Box";
import Map from "../components/ui/Map";
import { useState, useEffect } from "react";

// Fullscreen map view — map should receive its full height from the parent Box
export default function ExtrasPane() {
  const [currentView, setCurrentView] = useState("Files")

  function switcher() {
    if (currentView == "Files") {
        return <RecordingsView/>
    } else if (currentView == "SpeedTest") {
        return <SpeedTestEmbed/>
    } else {
        return "No pane selected."
    }
}
    // Let the parent (App) control the viewport height. Use flex:1 so Map fills available space.
  return (
    {switcher}
  );
}

export function SpeedTestView () {
    
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

export function RecordingsView () {
    
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