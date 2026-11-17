import {
  Alert,
  Box,
  Button,
  ButtonBase,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useCompetitionTimer } from "../../contexts/CompetitionTimerContext";

import { useConnectionStatus } from "../../contexts/ConnectionContext";

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export default function Clock({ openPane, setOpenPane, openUp = false }) {
  const { baseConnected } = useConnectionStatus();
  const isDemoMode = import.meta.env.MODE === "demo";
  const backendAvailable = baseConnected || isDemoMode;

  const {
    timerState,
    remainingSeconds,
    elapsedSeconds,
    isLoading,
    setPreset,
    setMode,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useCompetitionTimer();

  const isStopwatch = timerState.mode === "stopwatch";
  const displayedSeconds = isStopwatch
    ? elapsedSeconds
    : remainingSeconds;

  const progress =
    !isStopwatch && timerState.durationSeconds > 0
      ? (remainingSeconds / timerState.durationSeconds) * 100
      : 0;

  const isRunning = timerState.status === "running";
  const isFinished = timerState.status === "finished";

  const remainingMinutes = Math.floor(remainingSeconds / 60);

  const remainingPercent =
    timerState.durationSeconds > 0
      ? Math.round(
          (remainingSeconds / timerState.durationSeconds) * 100,
        )
      : 0;

  const isClockOpen = openPane === "Clock";

  const handleClockKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpenPane("Clock");
    }
  };

  return (
    <Box
      onMouseEnter={() => setOpenPane("Clock")}
      onMouseLeave={() => setOpenPane("None")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpenPane("None");
        }
      }}
      sx={{
        position: "relative",
        cursor: "pointer",
        textAlign: "center",
        mr: 2,
      }}
    >
      <ButtonBase
        component="button"
        type="button"
        aria-label="Open competition timer manager"
        aria-expanded={isClockOpen}
        aria-controls="competition-timer-manager"
        onClick={() => setOpenPane("Clock")}
        onKeyDown={handleClockKeyDown}
        sx={{
          borderRadius: 1,
          mr: 2,
          "&:focus-visible": {
            outline: "2px solid currentColor",
            outlineOffset: 2,
          },
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
        >
          {!isStopwatch && (
            <LinearProgress
              variant="determinate"
              value={remainingPercent}
              sx={{
                width: 28,
                height: 6,
                borderRadius: 3,
              }}
              aria-label={`${remainingPercent}% timer remaining`}
            />
          )}

          <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
            {isStopwatch
              ? `Stopwatch ${formatTime(elapsedSeconds)}`
              : `${remainingMinutes}m remaining`}
          </Typography>
        </Stack>
      </ButtonBase>

      {openPane === "Clock" && (
        <Box
          id="competition-timer-manager"
          role="dialog"
          aria-label="Competition timer manager"
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
              {formatTime(displayedSeconds)}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: "text.secondary", textAlign: "center" }}
            >
              Status: {timerState.status}
            </Typography>

            {!isStopwatch && (
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 8, borderRadius: 4 }}
              />
            )}

            {!backendAvailable && (
              <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>
                Base-pi backend is disconnected. Timer controls are disabled.
              </Alert>
            )}

            <Select
              size="small"
              value={timerState.mode}
              disabled={
                isLoading ||
                isRunning ||
                !backendAvailable
              }
              onChange={(event) => setMode(event.target.value)}
              inputProps={{
                "aria-label": "Timer mode",
              }}
            >
              <MenuItem value="countdown">
                Countdown
              </MenuItem>
              <MenuItem value="stopwatch">
                Stopwatch
              </MenuItem>
            </Select>

            <Select
              size="small"
              value={timerState.presetMinutes}
              disabled={
                isLoading ||
                isRunning ||
                !backendAvailable
              }
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
                disabled={
                  isLoading ||
                  isRunning ||
                  isFinished ||
                  !backendAvailable
                }
                onClick={startTimer}
              >
                START
              </Button>

              <Button
                fullWidth
                variant="outlined"
                disabled={isLoading || !isRunning || !backendAvailable}
                onClick={pauseTimer}
              >
                PAUSE
              </Button>

              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled={isLoading || !backendAvailable}
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