import "react-resizable/css/styles.css";
import { useState } from "react";
import { Box, Button, Paper } from "@mui/material";
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
function createData(vials, initialNM, finalNM, delta) {
  return { vials, initialNM, finalNM, delta };
}
export default function ScienceView() {
  const rows = [
    createData("V1", 0, 0, 0),
    createData("V2", 0, 0, 0),
    createData("V3", 0, 0, 0),
  ];
  const [TabContent, setTabContent] = useState(0);
  const tabNum = [0, 1, 2];
  const handleChange = (event, newTabContent) => {
    setTabContent(newTabContent);
  };
  const exampleFrequency1 = [
    515, 500, 515, 520, 515, 500, 525, 510, 500, 515, 500,
  ];
  const exampleFrequency2 = [
    545, 540, 545, 550, 540, 555, 545, 540, 545, 535, 545,
  ];
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
  const xTime = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
  return (
    <div
      className="flex flex-1 flex-col overflow-auto h-full min-h-0"
      style={{ userSelect: "none" }}
    >
      <div className="flex flex-row justify-center">
        <Button
          variant="contained"
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
          sx={{
            border: 1,
            borderColor: "black",
            backgroundColor: "red",
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
            <Tab label="Site 1" sx={{ fontSize: "0.75rem", minHeight: 32 }} />
            <Tab label="Site 2" sx={{ fontSize: "0.75rem", minHeight: 32 }} />
            <Tab label="Site 3" sx={{ fontSize: "0.75rem", minHeight: 32 }} />
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
                    {" "}
                    Coordinates: (_,_) <br /> Accuracy: ___ <br /> Range: ___{" "}
                    <br />
                    <Button
                      variant="contained"
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
                  <Box sx={{ width: "65%" }}>
                    <LineChart
                      series={[
                        { data: exampleFrequency1, label: "Frequency 1" },
                        { data: exampleFrequency2, label: "Frequency 2" },
                      ]}
                      xAxis={[{ scaleType: "point", data: xTime, height: 25 }]}
                      yAxis={[{ width: 45 }]}
                    />
                  </Box>
                  <Box sx={{ width: "35%", minHeight: 300 }}>
                    <TableContainer component={Paper}>
                      <Table aria-label="simple table">
                        <TableHead>
                          <TableRow>
                            <TableCell>vials</TableCell>
                            <TableCell align="right">initial</TableCell>
                            <TableCell align="right">final</TableCell>
                            <TableCell align="right">delta</TableCell>
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
                                {row.initialNM}
                              </TableCell>
                              <TableCell align="right">{row.finalNM}</TableCell>
                              <TableCell align="right">{row.delta}</TableCell>
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
