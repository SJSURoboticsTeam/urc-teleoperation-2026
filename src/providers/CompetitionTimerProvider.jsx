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

function calculateRemainingSeconds(state) {
  if (state.status === "running" && state.endsAt !== null) {
    return Math.max(
      0,
      Math.ceil((state.endsAt - Date.now()) / 1000),
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

  const applyTimerState = useCallback((state) => {
    if (!state) return;

    const normalizedState = normalizeTimerState(state);

    setTimerState(normalizedState);
    setRemainingSeconds(calculateRemainingSeconds(normalizedState));
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
      setRemainingSeconds(calculateRemainingSeconds(timerState));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [timerState]);

  const sendTimerAction = useCallback(
    (eventName, payload) => {
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
    [applyTimerState],
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

  const contextValue = useMemo(
    () => ({
      timerState,
      remainingSeconds,
      isLoading,
      setPreset,
      startTimer,
      pauseTimer,
      resetTimer,
    }),
    [
      timerState,
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