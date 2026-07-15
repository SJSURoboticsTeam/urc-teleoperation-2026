import "react-resizable/css/styles.css";
import { useState, useEffect } from "react";
import { Box, Button, Paper } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

function createData(vials, wavelength, absorbance) {
  return { vials, wavelength, absorbance };
}

function calculateAbsorbance(dataSet, clearVialData, index) {
  const absorbance = -Math.log10(dataSet[index] / clearVialData[index]);
  return absorbance.toFixed(3);
}

export default function ScienceGraphTable() {
  const frequencies = [415, 455, 480, 515, 555, 590, 630, 680];
  const clearVialData = [65535, 1364, 696, 568, 1466, 4655, 1140, 338];
  const purpleVialData = [9875, 136, 78, 68, 166, 494, 117, 37];
  const blueVialData = [17042, 231, 148, 104, 302, 817, 211, 68];
  const redVialData = [15923, 281, 271, 171, 276, 1156, 269, 92];

  const [rows, setRows] = useState([
    createData("clear", 0, 0),
    createData("purple", 0, 0),
    createData("blue", 0, 0),
    createData("red", 0, 0),
  ]);
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

        const purple = calculateAbsorbance(
          purpleVialData,
          clearVialData,
          prevIndex,
        );
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
    setIndex(0);
    setFrequency([]);
    setPurpleAbsorbance([]);
    setBlueAbsorbance([]);
    setRedAbsorbance([]);
    setRows([
      createData("clear", 0, 0),
      createData("purple", 0, 0),
      createData("blue", 0, 0),
      createData("red", 0, 0),
    ]);
  };

  return (
    <div className="flex flex-row gap-4 mb-4" style={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ width: "65%", height: 450 }}>
        <LineChart
          series={[
            { data: purpleAbsorbance, label: "Purple Vial" },
            { data: blueAbsorbance, label: "Blue Vial" },
            { data: redAbsorbance, label: "Red Vial" },
          ]}
          xAxis={[
            {
              scaleType: "point",
              data: frequency,
              label: "Wavelength (nm)",
            },
          ]}
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
          <Table aria-label="science absorbance table">
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
                  <TableCell align="right">{row.wavelength}</TableCell>
                  <TableCell
                    align="right"
                    sx={
                      row.vials === "clear"
                        ? {}
                        : {
                            backgroundColor:
                              Number(row.absorbance) >= 0.1 &&
                              Number(row.absorbance) <= 1
                                ? "#4caf50"
                                : "#f44336",
                          }
                    }
                  >
                    {row.absorbance}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </div>
  );
}
