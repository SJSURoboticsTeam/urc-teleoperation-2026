import { useCallback, useEffect, useMemo, useState } from "react";
import { basesocket } from "../components/socket.io/socket";
import {
  CompetitionTimerContext,
  DEFAULT_TIMER_STATE,
} from "../contexts/CompetitionTimerContext";

function normalizeTimerState(state) {
  return {
    ...DEFAULT_TIMER_STATE,
    ...state,
  };
}

function calculateRemainingSeconds(state, clockOffsetMs = 0) {
  if (state.status === "running" && state.endsAt !== null) {
    const clientNowAdjusted = Date.now() + clockOffsetMs;

    return Math.max(
      0,
      Math.ceil((state.endsAt - clientNowAdjusted) / 1000),
    );
  }

  return Math.max(0, state.remainingSeconds ?? 0);
}

export default function CompetitionTimerProvider({ children }) {
  const [timerState, setTimerState] = useState(DEFAULT_TIMER_STATE);
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_TIMER_STATE.remainingSeconds,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  const isDemoMode = import.meta.env.MODE === "demo";

  const applyTimerState = useCallback((state) => {
    if (!state) return;

    const normalizedState = normalizeTimerState(state);

    const nextClockOffsetMs =
      typeof normalizedState.serverNow === "number"
        ? normalizedState.serverNow - Date.now()
        : 0;

    setClockOffsetMs(nextClockOffsetMs);
    setTimerState(normalizedState);
    setRemainingSeconds(
      calculateRemainingSeconds(
        normalizedState,
        nextClockOffsetMs,
      ),
    );
  }, []);

  const requestCurrentTimerState = useCallback(() => {
    basesocket.emit("getCompetitionTimer", (state) => {
      applyTimerState(state);
    });
  }, [applyTimerState]);

  useEffect(() => {
    const handleTimerUpdated = (state) => {
      applyTimerState(state);
    };

    const handleBaseConnected = () => {
      requestCurrentTimerState();
    };

    basesocket.on("competitionTimerUpdated", handleTimerUpdated);
    basesocket.on("connect", handleBaseConnected);

    if (basesocket.connected) {
      requestCurrentTimerState();
    }

    return () => {
      basesocket.off("competitionTimerUpdated", handleTimerUpdated);
      basesocket.off("connect", handleBaseConnected);
    };
  }, [applyTimerState, requestCurrentTimerState]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRemainingSeconds(
        calculateRemainingSeconds(timerState, clockOffsetMs),
      );
      }, 1000);

      return () => {
        clearInterval(intervalId);
      };
      }, [timerState, clockOffsetMs]);

  const sendTimerAction = useCallback(
    (eventName, payload) => {
      if (isDemoMode) {
        let nextState;

        if (eventName === "setCompetitionTimer") {
          const presetMinutes = payload.presetMinutes;

          nextState = {
            ...DEFAULT_TIMER_STATE,
            presetMinutes,
            durationSeconds: presetMinutes * 60,
            remainingSeconds: presetMinutes * 60,
          };
        } else if (eventName === "startCompetitionTimer") {
          if (remainingSeconds <= 0) {
            return Promise.resolve({
              ok: false,
              error: "Timer has finished",
            });
          }

          const now = Date.now();

          nextState = {
            ...timerState,
            status: "running",
            remainingSeconds,
            startedAt: timerState.startedAt ?? now,
            endsAt: now + remainingSeconds * 1000,
          };
        } else if (eventName === "pauseCompetitionTimer") {
          const currentRemainingSeconds = calculateRemainingSeconds(
            timerState,
            clockOffsetMs,
          );

          nextState = {
            ...timerState,
            status:
              currentRemainingSeconds === 0
                ? "finished"
                : "paused",
            remainingSeconds: currentRemainingSeconds,
            endsAt: null,
          };
        } else if (eventName === "resetCompetitionTimer") {
          nextState = {
            ...timerState,
            status: "idle",
            remainingSeconds: timerState.durationSeconds,
            startedAt: null,
            endsAt: null,
          };
        } else {
          return Promise.resolve({
            ok: false,
            error: "Unknown timer action",
          });
        }

        applyTimerState(nextState);

        return Promise.resolve({
          ok: true,
          state: nextState,
        });
      }

      if (!basesocket.connected) {
        return Promise.resolve({
          ok: false,
          error: "Base backend is not connected",
        });
      }

      setIsLoading(true);

      return new Promise((resolve) => {
        const handleResponse = (error, response) => {
          setIsLoading(false);

          if (error) {
            resolve({
              ok: false,
              error: "Timer request timed out",
            });
            return;
          }

          if (response?.state) {
            applyTimerState(response.state);
          }

          resolve(response);
        };

        if (payload === undefined) {
          basesocket
            .timeout(3000)
            .emit(eventName, handleResponse);
        } else {
          basesocket
            .timeout(3000)
            .emit(eventName, payload, handleResponse);
        }
      });
    },
    [
      applyTimerState,
      clockOffsetMs,
      isDemoMode,
      remainingSeconds,
      timerState,
    ],
  );

  const setPreset = useCallback(
    (minutes) => {
      return sendTimerAction("setCompetitionTimer", {
        presetMinutes: minutes,
      });
    },
    [sendTimerAction],
  );

  const startTimer = useCallback(() => {
    return sendTimerAction("startCompetitionTimer");
  }, [sendTimerAction]);

  const pauseTimer = useCallback(() => {
    return sendTimerAction("pauseCompetitionTimer");
  }, [sendTimerAction]);

  const resetTimer = useCallback(() => {
    return sendTimerAction("resetCompetitionTimer");
  }, [sendTimerAction]);

  const effectiveTimerState = useMemo(() => {
    if (
      timerState.status === "running" &&
      remainingSeconds === 0
    ) {
      return {
        ...timerState,
        status: "finished",
      };
    }

    return timerState;
  }, [timerState, remainingSeconds]);

  const contextValue = useMemo(
    () => ({
      timerState: effectiveTimerState,
      remainingSeconds,
      isLoading,
      setPreset,
      startTimer,
      pauseTimer,
      resetTimer,
    }),
    [
      effectiveTimerState,
      remainingSeconds,
      isLoading,
      setPreset,
      startTimer,
      pauseTimer,
      resetTimer,
    ],
  );

  return (
    <CompetitionTimerContext.Provider value={contextValue}>
      {children}
    </CompetitionTimerContext.Provider>
  );
}