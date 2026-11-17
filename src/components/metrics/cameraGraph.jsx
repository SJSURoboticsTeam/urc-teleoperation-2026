import { LineChart } from "@mui/x-charts/LineChart";
import { Button, Box, InputLabel, MenuItem, FormControl, Select } from "@mui/material";
import { useMetrics } from "../../contexts/MetricsContext";

// Camera dropped-frames graph (issue #220). Data is sampled in MetricsProvider
// from the base-pi "videostats" event, so start/stop/clear/points are shared
// with the antenna graphs.
export default function CameraGraphs() {
  const { running, setRunning, points, setPoints, time, resetGraphs, cameraColors, droppedData } =
    useMetrics();

  return (
    <div className="flex flex-col">
      <div style={{ display: "flex", gap: "8px", marginLeft: "8px", marginBottom: "16px", marginTop: "8px" }}>
        <Button
          variant="contained"
          onClick={() => setRunning((prev) => !prev)}
          sx={{ width: "80px", fontSize: 16 }}
        >
          {running ? "stop" : "start"}
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={resetGraphs}
          sx={{ width: "125px", fontSize: 16 }}
        >
          CLEAR ALL
        </Button>
        <Box sx={{ minWidth: 110 }}>
          <FormControl size="small" fullWidth>
            <InputLabel id="camera-points-label">Points</InputLabel>
            <Select
              labelId="camera-points-label"
              id="camera-points-select"
              value={points}
              label="POINTS"
              onChange={(event) => setPoints(event.target.value)}
            >
              <MenuItem value={10}>Ten</MenuItem>
              <MenuItem value={20}>Twenty</MenuItem>
              <MenuItem value={30}>Thirty</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </div>
      <Box sx={{ width: "75%" }}>
        <LineChart
          height={350}
          width={700}
          skipAnimation
          series={Object.keys(droppedData).map((name) => ({
            data: droppedData[name],
            color: cameraColors[name],
            id: `Dropped ${name}`,
            label: `${name} (frames/s)`,
          }))}
          xAxis={[{ type: "linear", data: time, label: "Time (s)" }]}
          yAxis={[{ label: "Dropped frames (per second)", width: 55 }]}
        />
      </Box>
    </div>
  );
}