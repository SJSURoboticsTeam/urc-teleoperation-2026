import MetricsGraph from "../components/metrics/metricsGraph";
import { useState } from "react";
import Button from "@mui/material/Button";

// Fullscreen map view — map should receive its full height from the parent Box
export default function ExtrasView() {
  const [currentView, setcurrentView] = useState("Graphs");

  function switcher() {
    if (currentView == "Graphs") {
      return <Graphs />;
    } else if (currentView == "SpeedTest") {
      return <SpeedTestView />;
    } else if (currentView == "Files") {
      return <Files />;
    } else {
      return "No pane selected.";
    }
  }
  // Let the parent (App) control the viewport height. Use flex:1 so Map fills available space.
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-row items-center justify-center">
        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setcurrentView("Graphs")}
          variant="contained"
        >
          Graphs
        </Button>
        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setcurrentView("Files")}
          variant="contained"
        >
          Files
        </Button>
        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setcurrentView("SpeedTest")}
          variant="contained"
        >
          SpeedTest
        </Button>
      </div>
      {switcher()}
    </div>
  );
}

export function SpeedTestView() {
  return (
    <iframe
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        border: "none",
      }}
      src="http://192.168.1.100:3000"
      title="Speed Test"
      allow="fullscreen; autoplay"
    ></iframe>
  );
}

export function Files() {
  return (
    <iframe
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        border: "none",
      }}
      src="http://192.168.1.100:80"
      title="Files"
      allow="fullscreen; autoplay"
    ></iframe>
  );
}
export function Graphs() {
  return (
      <MetricsGraph />
  );
}
