import "react-resizable/css/styles.css";

import MetricsGraph from "../components/metrics/metricsGraph";
import Map from "../components/ui/Map";
import { useState } from "react";
import Button from "@mui/material/Button";

const SPEED_TEST_URL = "http://192.168.1.110:3000";
const FILES_URL = "http://192.168.1.110:80";

// Extras view for large map, metrics graphs, recordings/files, and speed test.
export default function ExtrasView() {
  const [currentView, setCurrentView] = useState("Map");

  function switcher() {
    if (currentView === "Map") {
      return <Map />;
    }

    if (currentView === "Graphs") {
      return <Graphs />;
    }

    if (currentView === "Files") {
      return <Files />;
    }

    if (currentView === "SpeedTest") {
      return <SpeedTestView />;
    }

    return "No pane selected.";
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-row items-center justify-center">
        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setCurrentView("Map")}
          variant="contained"
        >
          Large Map
        </Button>

        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setCurrentView("Graphs")}
          variant="contained"
        >
          Graphs
        </Button>

        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setCurrentView("Files")}
          variant="contained"
        >
          Files
        </Button>

        <Button
          style={{ marginRight: 5, marginLeft: 5 }}
          onClick={() => setCurrentView("SpeedTest")}
          variant="contained"
        >
          SpeedTest
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {switcher()}
      </div>
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
      src={SPEED_TEST_URL}
      title="Speed Test"
      allow="fullscreen; autoplay"
    />
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
      src={FILES_URL}
      title="Files"
      allow="fullscreen; autoplay"
    />
  );
}

export function Graphs() {
  return <MetricsGraph />;
}