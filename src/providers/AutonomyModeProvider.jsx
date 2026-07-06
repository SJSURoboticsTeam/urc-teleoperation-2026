// Provider wrapper used at the app level
import { AutonomyModeContext } from "../contexts/AutonomyModeContext";

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