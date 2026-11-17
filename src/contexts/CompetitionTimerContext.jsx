import { createContext, useContext } from "react";

export const TIMER_PRESETS = [5, 10, 15, 20, 30, 45, 60];

export const DEFAULT_TIMER_STATE = {
  serverNow: null,
  mode: "countdown",
  status: "idle",
  presetMinutes: 5,
  durationSeconds: 300,
  remainingSeconds: 300,
  elapsedSeconds: 0,
  elapsedMilliseconds: 0,
  startedAt: null,
  endsAt: null,
};

export const CompetitionTimerContext = createContext({
  timerState: DEFAULT_TIMER_STATE,
  remainingSeconds: DEFAULT_TIMER_STATE.remainingSeconds,
  isLoading: false,
  setPreset: () => {},
  setMode: () => {},
  startTimer: () => {},
  pauseTimer: () => {},
  resetTimer: () => {},
});

export function useCompetitionTimer() {
  return useContext(CompetitionTimerContext);
}