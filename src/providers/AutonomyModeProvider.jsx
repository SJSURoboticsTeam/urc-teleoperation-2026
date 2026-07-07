// Provider wrapper used at the app level
import { AutonomyModeContext } from "../contexts/AutonomyModeContext";

// Import in App.jsx and wrap around components that need access to it
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