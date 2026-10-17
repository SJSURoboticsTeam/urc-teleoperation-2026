import { Box, Typography } from "@mui/material";
import { amber } from "@mui/material/colors";
import { useSoftStop } from "../../contexts/SoftStopContext";

// Persistent warning shown above every view while Soft Stop is active
export default function SoftStopBanner() {
  const { softStopActive } = useSoftStop();

  if (!softStopActive) return null;

  return (
    <Box
      role="status"
      sx={{
        bgcolor: amber[100],
        border: 1,
        borderColor: amber[700],
        borderRadius: 1,
        px: 2,
        py: 1,
        mb: 1,
        textAlign: "center",
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontWeight: 700, color: amber[900] }}>
        ⏸ CONTROLS PAUSED — Soft Stop is active. Click Resume to continue.
      </Typography>
    </Box>
  );
}
