import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";
import ScienceGraphTable from "../components/science/ScienceGraphTable";

export default function ScienceView() {
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

                <ScienceGraphTable />
              </div>
            ) : null,
          )}
        </Box>
      </Box>
    </div>
  );
}