import { createContext, useContext } from "react";

// Global context used to share whether autonomy mode is enabled
const AutonomyModeContext = createContext({
  autonomyEnabled: false,
  setAutonomyEnabled: () => {},
});

// Hook for consuming autonomy mode state
export function useAutonomyMode() {
  return useContext(AutonomyModeContext);
}

// Provider wrapper used at the app level
export default function AutonomyModeProvider({
  autonomyEnabled,
  setAutonomyEnabled,
  children,
}) {
  return (
    <AutonomyModeContext.Provider
      value={{ autonomyEnabled, setAutonomyEnabled }}
    >
      {children}
    </AutonomyModeContext.Provider>
  );
}