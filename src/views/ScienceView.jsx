import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";
import { useSoftStop } from "../contexts/SoftStopContext";
import ScienceGraphTable from "../components/science/ScienceGraphTable";
import { usePeripherals } from "../contexts/PeripheralContext";
import { useGPS } from "../contexts/GPSContext";
import { useScience } from "../contexts/ScienceContext";
import { emptyScienceSession } from "../components/science/demoScienceSession";

export default function ScienceView() {
  const { servercanState } = usePeripherals();

  const [tabContent, setTabContent] = useState(0);

  const { robotCoordinates } = useGPS();

  const [siteReadings, setSiteReadings] = useState([null, null, null])

  // Read global autonomy state
  const { autonomyEnabled } = useAutonomyMode();
  const { softStopActive } = useSoftStop();

  // Lock science controls whenever autonomy is enabled or Soft Stop is active
  const controlsLocked = autonomyEnabled || softStopActive;

  const {
    session,
    connected,
    canCommand,
    pending,
    startSite,
    step,
    stop,
    resetSite,
  } = useScience();

  // Render from a layout-only snapshot until the backend answers, so the page never collapses.
  // The backend owns all science state; the only thing kept here is which tab is selected
  const shown = session ?? emptyScienceSession;
  const site = shown.sites[tabContent];
  const reading = siteReadings[tabContent];

  // Which site the Reset dialog was opened for (null = closed). Captured at open time so a
  // tab change or a broadcast can never retarget it
  const [resetTargetId, setResetTargetId] = useState(null);
  const resetTarget = shown.sites.find((s) => s.id === resetTargetId);

  // Button rules, all in one place. UX only: the server re-validates every command
  const canAct = !controlsLocked && canCommand && !pending;

  const canStepSite = (s) =>
    canAct &&
    !!s &&
    (s.status === "in_progress" ||
      (s.status === "not_started" && shown.activeSite === null));

  const canResetSite = (s) =>
    canAct && !!s && (s.status === "in_progress" || s.status === "complete");

  // STOP ignores `pending`: a stop must never wait behind another command
  const canStop = !controlsLocked && canCommand;

  // One Step button: starts a site that hasn't begun, otherwise sends the next step
  const handleStep = () => {
    if (site.status === "not_started") startSite(site.id);
    else step(site.id);
  };

  const handleConfirmReset = () => {
    resetSite(resetTargetId);
    setResetTargetId(null);
  };

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

  return (
    <div
      className="flex flex-1 flex-col overflow-auto h-full min-h-0"
      style={{ userSelect: "none" }}
    >
    {(connected && session && !session.mock && servercanState.science.state == "idle" && !controlsLocked) && (
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
      {!canCommand && (
        <Typography sx={{ textAlign: "center", mb: 1 }}>
          Science backend not connected
        </Typography>
      )}

      <div className="flex flex-row justify-center">
        <Button
          variant="contained"
          disabled={!canStepSite(site)}
          onClick={handleStep}
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
          disabled={!canResetSite(site)}
          onClick={() => setResetTargetId(site.id)}
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
          Reset
        </Button>

        <Button
          variant="contained"
          disabled={!canStop}
          onClick={stop}
          sx={{
            border: 1,
            borderColor: "black",
            backgroundColor: canStop ? "red" : undefined,
            height: 40,
            width: "auto",
            display: "flex",
            justifyContent: "center",
            marginBottom: 2,
            ml: 1,
          }}
        >
          STOP
        </Button>
      </div>

      <Dialog open={resetTargetId !== null} onClose={() => setResetTargetId(null)}>
        <DialogTitle>Reset {resetTarget?.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Its readings stay in the science log file but will be cleared from this
            screen.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetTargetId(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={!canResetSite(resetTarget)}
            onClick={handleConfirmReset}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <Stepper
        activeStep={shown.activeSite === null ? -1 : shown.activeSite + 1}
        alternativeLabel
      >
        <Step completed={shown.sites.some((s) => s.status !== "not_started")}>
          <StepLabel>Start</StepLabel>
        </Step>
        {shown.sites.map((s) => (
          <Step key={s.id} completed={s.status === "complete"}>
            <StepLabel>{s.name}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ flex: 1, height: 400 }}>
        <Box sx={{ border: 1, borderRadius: 2, borderColor: "divider" }}>
          <Tabs
            value={tabContent}
            onChange={handleChange}
            sx={{ minHeight: 32, width: "auto" }}
          >
            {shown.sites.map((s) => (
              <Tab
                key={s.id}
                label={s.name}
                sx={{ fontSize: "0.75rem", minHeight: 32 }}
                disabled={controlsLocked}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 1 }}>
          <div>
            {site.lastError && (
              <Typography color="error" fontWeight={700} sx={{ mb: 1 }}>
                {site.lastError}
              </Typography>
            )}
            <div className="flex flex-row">
              <Box sx={{ width: "60%", overflowX: "auto", minWidth: 0 }}>
                <Stepper
                  activeStep={site.pendingStep ?? -1}
                  alternativeLabel
                  sx={{
                    minWidth: "max-content",
                    "& .MuiStep-root": { px: 0 },
                    "& .MuiStepLabel-label": {
                      fontSize: "0.75rem",
                      whiteSpace: "nowrap",
                    },
                    "& .MuiStepConnector-root": {
                      left: "calc(-50% + 14px)",
                      right: "calc(50% + 14px)",
                    },
                  }}
                >
                  {shown.steps.map((name, index) => (
                    <Step key={index} completed={index <= site.currentStep}>
                      <StepLabel
                        optional={
                          index === site.pendingStep ? (
                            <Typography variant="caption">Running…</Typography>
                          ) : undefined
                        }
                      >
                        {name}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
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

            <ScienceGraphTable
              site={site}
              wavelengths={shown.wavelengths}
              vials={shown.vials}
            />
          </div>
        </Box>
      </Box>
    </div>
  );
}