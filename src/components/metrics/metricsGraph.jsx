import "react-resizable/css/styles.css";
import { LineChart } from "@mui/x-charts/LineChart";
import { Button, Box, InputLabel, MenuItem, FormControl, Select } from "@mui/material";
import { useMetrics } from "../../contexts/MetricsContext";

export default function MetricsGraph() {
  const {
    running,
    setRunning,
    points,
    setPoints,
    time,
    resetGraphs,
    colors,
    signalData900,
    signalData5,
    noiseData900,
    noiseData5,
    txData900,
    rxData900,
    txData5,
    rxData5,
  } = useMetrics();

  const handleChange = (event) => {
    setPoints(event.target.value);
  };

  return (
    <div className="flex flex-col">
      <div style={{ display: "flex", gap: "8px", marginLeft: "8px", marginBottom: "16px" }}>
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
            <InputLabel id="metrics-points-label">Points</InputLabel>
            <Select
              labelId="metrics-points-label"
              id="metrics-points-select"
              value={points}
              label="POINTS"
              onChange={handleChange}
            >
              <MenuItem value={10}>Ten</MenuItem>
              <MenuItem value={20}>Twenty</MenuItem>
              <MenuItem value={30}>Thirty</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </div>
      <div className="flex flex-row">
        <Box>
          <SignalGraph
            data900={signalData900}
            data5={signalData5}
            colors={colors}
            time={time}
          />
        </Box>
        <Box>
          <NoiseGraph
            data900={noiseData900}
            data5={noiseData5}
            colors={colors}
            time={time}
          />
        </Box>
      </div>
      <div className="flex flex-row">
        <Box>
          <TxRx900Graph
            data900={txData900}
            data900Alt={rxData900}
            colors={colors}
            time={time}
          />
        </Box>
        <Box>
          <TxRx5Graph
            data5={txData5}
            data5Alt={rxData5}
            colors={colors}
            time={time}
          />
        </Box>
      </div>
    </div>
  );
}

function SignalGraph({ data900, data5, colors, time }) {
  return (
    <Box sx={{ width: "75%" }}>
      <LineChart
        height={300}
        width={500}
        skipAnimation
        series={[
          {
            data: data900,
            color: colors["900"],
            id: "Signal Strength 900MHz",
            label: "Signal Strength 900MHz (dBm)",
          },
          {
            data: data5,
            color: colors["5"],
            id: "Signal Strength 5GHz",
            label: "Signal Strength 5GHz (dBm)",
          },
        ]}
        xAxis={[{ type: "linear", data: time, label: "Time (s)" }]}
        yAxis={[{ label: "Signal Strength (dBm)", width: 55 }]}
      />
    </Box>
  );
}

function NoiseGraph({ data900, data5, colors, time }) {
  return (
    <Box sx={{ width: "75%" }}>
      <LineChart
        height={300}
        width={500}
        skipAnimation
        series={[
          {
            data: data900,
            color: colors["900"],
            id: "Noise 900MHz",
            label: "Noise 900MHz (dBm)",
          },
          {
            data: data5,
            color: colors["5"],
            id: "Noise 5GHz",
            label: "Noise 5GHz (dBm)",
          },
        ]}
        xAxis={[{ type: "linear", data: time, label: "Time (s)" }]}
        yAxis={[{ label: "Noise (dBm)", width: 55 }]}
      />
    </Box>
  );
}

function TxRx900Graph({ data900, data900Alt, colors, time }) {
  return (
    <Box sx={{ width: "75%" }}>
      <LineChart
        height={300}
        width={500}
        skipAnimation
        series={[
          { data: data900, color: colors["900"], id: "Tx 900MHz", label: "Tx 900MHz (Mbps)" },
          { data: data900Alt, color: colors["900-alt"], id: "Rx 900MHz", label: "Rx 900MHz (Mbps)" },
        ]}
        xAxis={[{ type: "linear", data: time, label: "Time (s)" }]}
        yAxis={[{ label: "Tx/Rx 900MHz (Mbps)", width: 50 }]}
      />
    </Box>
  );
}

function TxRx5Graph({ data5, data5Alt, colors, time }) {
  return (
    <Box sx={{ width: "75%" }}>
      <LineChart
        height={300}
        width={500}
        skipAnimation
        series={[
          { data: data5, id: "Tx 5GHz", color: colors["5"], label: "Tx 5GHz (Mbps)" },
          { data: data5Alt, id: "Rx 5GHz", color: colors["5-alt"], label: "Rx 5GHz (Mbps)" },
        ]}
        xAxis={[{ type: "linear", data: time, label: "Time (s)" }]}
        yAxis={[{ label: "Tx/Rx 5GHz (Mbps)", width: 50 }]}
      />
    </Box>
  );
}
