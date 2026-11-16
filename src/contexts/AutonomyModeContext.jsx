import { createContext, useContext } from "react";

// Global context used to share the rover mode state sent by the rover backend
export const AutonomyModeContext = createContext({
  autonomyState: null,
  autonomyEnabled: false,
  sendAutonomyCommand: () => {},
});

// Hook/function for consuming autonomy mode state
export function useAutonomyMode() {
  return useContext(AutonomyModeContext);
}
