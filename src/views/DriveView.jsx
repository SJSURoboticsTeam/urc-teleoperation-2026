import DriveManualInput from "../components/gamepad/DriveWidget";
import { lazy, Suspense, useRef } from "react";
import { Box, Typography } from "@mui/material";
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
  const showCanWarning = canState.driveState == "idle" && !controlsLocked;
  const showControlWarning = !controlsLocked && !hasControl;

  return (
    <div
      ref={containerRef}
      className="flex flex-1 h-full min-h-0"
      style={{ userSelect: "none" }}
    >
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        {(showCanWarning || showControlWarning) && (
          <Typography
            sx={{
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            {showCanWarning && (
              <Box component="span" sx={{ color: "error.main" }}>
                You don't have {canState.uartMode} connected!
              </Box>
            )}
            {showCanWarning && showControlWarning && (
              <Box component="span" sx={{ color: "text.secondary", mx: 1 }}>
                •
              </Box>
            )}
            {showControlWarning && (
              <Box component="span" sx={{ color: "warning.main" }}>
                No drive control: take it from STATUS (mast still works).
              </Box>
            )}
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
