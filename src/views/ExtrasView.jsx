import Map from "../components/ui/Map";
import DriveManualInput from "../components/gamepad/DriveWidget";
import { useRef } from "react";
import { Typography, Box } from "@mui/material";
import { useAutonomyMode } from "../contexts/AutonomyModeContext";

export default function DriveComponents({}) {
  const containerRef = useRef(null);

  // Read global autonomy state
  const { autonomyEnabled } = useAutonomyMode();

  // Lock drive controls whenever autonomy is enabled
  const controlsLocked = autonomyEnabled;

  return (
    // top-level flex row that fills available height
    <div
      ref={containerRef}
      className="flex flex-1 h-full min-h-0"
      style={{ userSelect: "none" }}
    >
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        <div className="flex flex-row items-center justify-center gap-6">
          {controlsLocked ? (
            <Box sx={{ textAlign: "center", my: 2 }}>
              <Typography color="error" fontWeight={700}>
                Drive controls are disabled while autonomy is active.
              </Typography>
            </Box>
          ) : (
            <DriveManualInput />
          )}
        </div>

        <Map />
      </div>
    </div>
  );
}