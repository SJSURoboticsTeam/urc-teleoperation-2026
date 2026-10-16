import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";
import { useSoftStop } from "../contexts/SoftStopContext";
import ScienceGraphTable from "../components/science/ScienceGraphTable";
import { usePeripherals } from "../contexts/PeripheralContext";
import { useGPS } from "../contexts/GPSContext";

export default function ScienceView() {
  const { canState } = usePeripherals();

  const [tabContent, setTabContent] = useState(0);

  const { robotCoordinates } = useGPS();

  const [siteReadings, setSiteReadings] = useState([null, null, null])

  // Read global autonomy state
  const { autonomyEnabled } = useAutonomyMode();
  const { softStopActive } = useSoftStop();

  // Lock science controls whenever autonomy is enabled or Soft Stop is active
  const controlsLocked = autonomyEnabled || softStopActive;

  const tabNum = [0, 1, 2];

  const handleChange = (event, newTabContent) => {
    if (controlsLocked) return;
    setTabContent(newTabContent);
  };

  const handleGetGNSS = () => {
    if (controlsLocked) return;
    if (!robotCoordinates.receive) return;

    setSiteReadings((prev) => {
      const next = [...prev];
      next[tabContent] = {
        lat: robotCoordinates.lat,
        long: robotCoordinates.long,
        accuracy_m: robotCoordinates.accuracy_m,
        capturedAt: Date.now(),
      };
      return next;
    });
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
    {(canState.scienceState == "idle"&& !controlsLocked) && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
            }}
            color="error"
          >
            You don't have CAN connected!
          </Typography>
        )}
      {controlsLocked && (
        <Typography
          color="error"
          fontWeight={700}
          sx={{ textAlign: "center", mb: 1 }}
        >
          Science controls are disabled while autonomy or Soft Stop is active.
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
            value={tabContent}
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
          {tabNum.map((num) => {
            const reading = siteReadings[num];
            return tabContent === num ? (
              <div key={num}>
                <div className="flex flex-row">
                  <Box sx={{ width: "60%", overflowX: "auto", minWidth: 0 }}>
                    <div className="steps inline-flex" style={{ minWidth: "max-content" }}>
                      {exampleSteps.map((step, index) => (
                        <div key={index} className="step step-accent">
                          {step}
                        </div>
                      ))}
                    </div>
                  </Box>
                  <Box className="flex flex-row" sx={{ ml: 4 }}>
                    Coordinates: ({reading ? `${reading.lat.toFixed(6)}, ${reading.long.toFixed(6)}` : "Not yet captured"}) <br />
                    Accuracy: {reading && reading.accuracy_m ? `${reading.accuracy_m}m` : "---"} <br />
                    Range: ___{" "}
                    <br />

                    <Button
                      variant="contained"
                      disabled={controlsLocked || !robotCoordinates.receive}
                      onClick={handleGetGNSS}
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

                <ScienceGraphTable controlsLocked={controlsLocked} />
              </div>
            ) : null;  
          })}
        </Box>
      </Box>
    </div>
  );
}