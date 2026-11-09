import {
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useCompetitionTimer } from "../../contexts/CompetitionTimerContext";

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export default function Clock({ openPane, setOpenPane, openUp = false }) {
  const {
    timerState,
    remainingSeconds,
    isLoading,
    setPreset,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useCompetitionTimer();

  const progress =
    timerState.durationSeconds > 0
      ? (remainingSeconds / timerState.durationSeconds) * 100
      : 0;

  const isRunning = timerState.status === "running";

  return (
    <Box
      onMouseEnter={() => setOpenPane("Clock")}
      onMouseLeave={() => setOpenPane("None")}
      sx={{
        position: "relative",
        cursor: "pointer",
        textAlign: "center",
        mr: 2,
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
        {timerState.presetMinutes}m remaining
      </Typography>

      {openPane === "Clock" && (
        <Box
          sx={{
            position: "absolute",
            ...(openUp ? { bottom: "100%" } : { top: "100%" }),
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            width: 280,
            p: 2,
            backgroundColor: "white",
            border: "1px solid",
            borderColor: "grey.400",
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ color: "black" }}>
              CLOCK MANAGER
            </Typography>

            <Typography
              variant="h4"
              sx={{ color: "black", textAlign: "center" }}
            >
              {formatTime(remainingSeconds)}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: "text.secondary", textAlign: "center" }}
            >
              Status: {timerState.status}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />

            <Select
              size="small"
              value={timerState.presetMinutes}
              disabled={isLoading || isRunning}
              onChange={(event) => setPreset(Number(event.target.value))}
            >
              {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                <MenuItem key={minutes} value={minutes}>
                  {minutes} minutes
                </MenuItem>
              ))}
            </Select>

            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="contained"
                disabled={isLoading || isRunning}
                onClick={startTimer}
              >
                START
              </Button>

              <Button
                fullWidth
                variant="outlined"
                disabled={isLoading || !isRunning}
                onClick={pauseTimer}
              >
                PAUSE
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={isLoading}
                onClick={resetTimer}
              >
                RESET
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Box>
  );
}