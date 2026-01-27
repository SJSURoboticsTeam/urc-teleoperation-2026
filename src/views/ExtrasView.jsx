import "react-resizable/css/styles.css"; // keep global resizable styles if used elsewhere
import Box from "@mui/material/Box";
import Map from "../components/ui/Map";
import { useState } from "react";
import Button from '@mui/material/Button';

// Fullscreen map view — map should receive its full height from the parent Box
export default function ExtrasView() {
  const [currentView, setcurrentView] = useState("Map");

  function switcher() {
    if (currentView == "Files") {
        return <RecordingsView/>
    } else if (currentView == "SpeedTest") {
        return <SpeedTestView/>
    } else if (currentView == "Map") {
        return <Map/>
    } else {
        return "No pane selected."
    }
    }
    // Let the parent (App) control the viewport height. Use flex:1 so Map fills available space.
  return (
          <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
            <div className="flex flex-row items-center justify-center gap-6">
              <Button onClick={() => setcurrentView("Files")} variant="contained">Files</Button>
              <Button onClick={() => setcurrentView("SpeedTest")} variant="contained">SpeedTest</Button>
              <Button onClick={() => setcurrentView("Map")} variant="contained">Map</Button>
              </div>
            {switcher()}
          </div>
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