import DriveManualInput from "../components/gamepad/DriveWidget";
import { lazy, Suspense, useRef } from "react";
import { Typography } from "@mui/material";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";
import { usePeripherals } from "../contexts/PeripheralContext";
import { useDriveControl } from "../contexts/DriveControlContext";

const Map = lazy(() => import("../components/ui/Map"));

export default function DriveComponents() {
  const { canState } = usePeripherals();
  const containerRef = useRef(null);

  // Read global autonomy state
  const { autonomyEnabled } = useAutonomyMode();
  const { hasControl } = useDriveControl();
  const controlsLocked = autonomyEnabled;
  const driveLocked = autonomyEnabled || !hasControl;

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
        {!autonomyEnabled && !hasControl && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
            }}
            color="warning.main"
          >
            You don't have drive control. Take control from STATUS in the top bar. Mast controls still work.
          </Typography>
        )}

        <div className="flex flex-row items-center justify-center gap-6">
          <DriveManualInput controlsLocked={controlsLocked} driveLocked={driveLocked} />
        </div>

        <Suspense
          fallback={
            <div className="w-full flex-1 min-h-0 bg-gray-200 flex items-center justify-center">
              Loading map…
            </div>
          }
        >
          <Map />
        </Suspense>
      </div>
    </div>
  );
}
