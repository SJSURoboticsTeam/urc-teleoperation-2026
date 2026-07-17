import { createContext, useContext } from "react";

// Global context used to share whether autonomy mode is enabled
export const AutonomyModeContext = createContext({
  autonomyEnabled: false,
  setAutonomyEnabled: () => {},
});

// Hook/function for consuming autonomy mode state
export function useAutonomyMode() {
  return useContext(AutonomyModeContext);
}
