import "react-resizable/css/styles.css";
import { useState, useEffect } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";

function createData(vials, wavelength, absorbance) {
  return { vials, wavelength, absorbance };
}

function calculateAbsorbance(dataSet, clearVialData, index) {
  const absorbance = -Math.log10(dataSet[index] / clearVialData[index]);
  return absorbance.toFixed(3);
}
export default function ScienceView() {
  const [rows, setRows] = useState([
    createData("clear", 0, 0),
    createData("purple", 0, 0),
    createData("blue", 0, 0),
    createData("red", 0, 0),
  ]);

  const [TabContent, setTabContent] = useState(0);

  // Read global autonomy state
  const { autonomyEnabled } = useAutonomyMode();

  // Lock science controls whenever autonomy is enabled
  const controlsLocked = autonomyEnabled;

  const tabNum = [0, 1, 2];

  const handleChange = (event, newTabContent) => {
    if (controlsLocked) return;
    setTabContent(newTabContent);
  };

const exampleSteps = [
    "Start",
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4",
    "Step 5",
    "Step 6",
    "Step 7",
    "Step 8",
    "Step 9",
    "Step 10",
  ];

  // Vial spectroscopy data
  const frequencies = [415, 455, 480, 515, 555, 590, 630, 680]; // wavelengths in nm
  const clearVialData = [65535, 1364, 696, 568, 1466, 4655, 1140, 338];
  const purpleVialData = [9875, 136, 78, 68, 166, 494, 117, 37];
  const blueVialData = [17042, 231, 148, 104, 302, 817, 211, 68];
  const redVialData = [15923, 281, 271, 171, 276, 1156, 269, 92];

  const [purpleAbsorbance, setPurpleAbsorbance] = useState([]);
  const [blueAbsorbance, setBlueAbsorbance] = useState([]);
  const [redAbsorbance, setRedAbsorbance] = useState([]);
  const [frequency, setFrequency] = useState([]);


  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setIndex((prevIndex) => {
        if (prevIndex >= frequencies.length) {
          setRunning(false);
          setFinished(true);
          clearInterval(interval);
          return prevIndex;
        }
        const purple = calculateAbsorbance(purpleVialData, clearVialData, prevIndex);
        const blue = calculateAbsorbance(blueVialData, clearVialData, prevIndex);
        const red = calculateAbsorbance(redVialData, clearVialData, prevIndex);
        const wavelength = frequencies[prevIndex];

        setFrequency((prev) => [...prev, wavelength]);
        setPurpleAbsorbance((prev) => [...prev, purple]);
        setBlueAbsorbance((prev) => [...prev, blue]);
        setRedAbsorbance((prev) => [...prev, red]);

        setRows([
          createData("clear", wavelength, 0),
          createData("purple", wavelength, purple),
          createData("blue", wavelength, blue),
          createData("red", wavelength, red),
        ]);
        return prevIndex + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  const start = () => {
  if (finished) return;
  setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setFinished(false);

    // Reset graph
    setIndex(0);
    setFrequency([]);
    setPurpleAbsorbance([]);
    setBlueAbsorbance([]);
    setRedAbsorbance([]);

    // Reset table
    setRows([
      createData("clear", 0, 0),
      createData("purple", 0, 0),
      createData("blue", 0, 0),
      createData("red", 0, 0),
    ]);
  };

  return (
    <div
      className="flex flex-1 flex-col overflow-auto h-full min-h-0"
      style={{ userSelect: "none" }}
    >
      {controlsLocked && (
        <Typography
          color="error"
          fontWeight={700}
          sx={{ textAlign: "center", mb: 1 }}
        >
          Science controls are disabled while autonomy is active.
        </Typography>
      )}

      <div className="flex flex-row justify-center">
        <Button
          variant="contained"
          disabled={controlsLocked}
          sx={{
            border: 1,
            borderColor: "black",
            height: 40,
            width: "auto",
            display: "flex",
            justifyContent: "center",
            marginBottom: 2,
            ml: 1,
          }}
        >
          Start Site Investigation
        </Button>

        <Button
          variant="contained"
          disabled={controlsLocked}
          sx={{
            border: 1,
            borderColor: "black",
            height: 40,
            width: "auto",
            display: "flex",
            justifyContent: "center",
            marginBottom: 2,
            ml: 1,
          }}
        >
          Step
        </Button>

        <Button
          variant="contained"
          disabled={controlsLocked}
          sx={{
            border: 1,
            borderColor: "black",
            backgroundColor: controlsLocked ? undefined : "red",
            height: 40,
            width: "auto",
            display: "flex",
            justifyContent: "center",
            marginBottom: 2,
            ml: 1,
          }}
        >
          Science E-Stop
        </Button>
      </div>

      <div className="steps flex justify-center">
        <div className="step step-accent">Start</div>
        <div className="step step-accent">Site 1</div>
        <div className="step step-accent">Site 2</div>
        <div className="step step-accent">Site 3</div>
      </div>

      <Box sx={{ flex: 1, height: 400 }}>
        <Box sx={{ border: 1, borderRadius: 2, borderColor: "divider" }}>
          <Tabs
            value={TabContent}
            onChange={handleChange}
            sx={{ minHeight: 32, width: "auto" }}
          >
            <Tab
              label="Site 1"
              sx={{ fontSize: "0.75rem", minHeight: 32 }}
              disabled={controlsLocked}
            />
            <Tab
              label="Site 2"
              sx={{ fontSize: "0.75rem", minHeight: 32 }}
              disabled={controlsLocked}
            />
            <Tab
              label="Site 3"
              sx={{ fontSize: "0.75rem", minHeight: 32 }}
              disabled={controlsLocked}
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 1 }}>
          {tabNum.map((num) =>
            TabContent === num ? (
              <div key={num}>
                <div className="flex flex-row">
                  <Box sx={{ width: "60%", overflowX: "auto" }}>
                    <div className="steps">
                      {exampleSteps.map((step, index) => (
                        <div key={index} className="step step-accent">
                          {step}
                        </div>
                      ))}
                    </div>
                  </Box>
                  <Box className="flex flex-row" sx={{ ml: 4 }}>
                    Coordinates: (_,_) <br /> Accuracy: ___ <br /> Range: ___{" "}
                    <br />

                    <Button
                      variant="contained"
                      disabled={controlsLocked}
                      sx={{
                        border: 1,
                        borderColor: "black",
                        height: 45,
                        width: "auto",
                        display: "flex",
                        justifyContent: "center",
                        ml: 2,
                      }}
                    >
                      GET GNSS
                    </Button>
                  </Box>
                </div>

                <div
                  className="flex flex-row gap-4 mb-4"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <Box sx={{ width: "65%", height: 450}}>
                    <LineChart
                      series={[
                        { data: purpleAbsorbance, label: "Purple Vial" },
                        { data: blueAbsorbance, label: "Blue Vial" },
                        { data: redAbsorbance, label: "Red Vial" },
                      ]}
                      xAxis={[{ scaleType: "point", data: frequency, label: "Wavelength (nm)" }]}
                      yAxis={[{ label: "Absorbance", width: 45 }]}
                      margin={{ left: 60, bottom: 40 }}
                    />
                    <Button
                      variant="contained"
                      onClick={finished || running ? stop : start}
                      sx={{ width: "80px", fontSize: 16 }}
                    >
                      {finished || running ? "Stop" : "Start"}
                    </Button>
                  </Box>

                  <Box sx={{ width: "35%", minHeight: 300, mt: 5, ml: 3 }}>
                    <TableContainer component={Paper}>
                      <Table aria-label="simple table">
                        <TableHead>
                          <TableRow>
                            <TableCell>vials</TableCell>
                            <TableCell align="right">wavelength</TableCell>
                            <TableCell align="right">absorbance</TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {rows.map((row) => (
                            <TableRow
                              key={row.vials}
                              sx={{
                                "&:last-child td, &:last-child th": {
                                  border: 0,
                                },
                              }}
                            >
                              <TableCell component="th" scope="row">
                                {row.vials}
                              </TableCell>
                              <TableCell align="right">
                                {row.wavelength}
                              </TableCell>
                              <TableCell align="right">{row.absorbance}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </div>
              </div>
            ) : null,
          )}
        </Box>
      </Box>
    </div>
  );
}