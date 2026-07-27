import Map from "../components/ui/Map";
import DriveManualInput from "../components/gamepad/DriveWidget";
import { useRef } from "react";
import { Typography } from "@mui/material";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";
import { usePeripherals } from "../contexts/PeripheralContext";

export default function DriveComponents() {
  const { canState } = usePeripherals();
  const containerRef = useRef(null);

  // Read global autonomy state
  const { autonomyEnabled } = useAutonomyMode();
  const controlsLocked = autonomyEnabled;

  return (
    <div
      ref={containerRef}
      className="flex flex-1 h-full min-h-0"
      style={{ userSelect: "none" }}
    >
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        {(canState.driveState == "idle" && !controlsLocked) && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
            }}
            color="error"
          >
            You don't have {canState.uartMode} connected!
          </Typography>
        )}
        {controlsLocked && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
            }}
            color="error"
          >
            Drive controls are disabled while autonomy is active.
          </Typography>
        )}

        <div className="flex flex-row items-center justify-center gap-6">
          <DriveManualInput controlsLocked={controlsLocked} />
        </div>

        <Map />
      </div>
    </div>
  );
}
