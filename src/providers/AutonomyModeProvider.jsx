// Provider wrapper used at the app level
import { AutonomyModeContext } from "../contexts/AutonomyModeContext";
import { useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function AutonomyModeProvider({ children }) {
  const [autonomyEnabled, setAutonomyEnabled] = useState(false);
  return (
    <AutonomyModeContext.Provider
      value={{ autonomyEnabled, setAutonomyEnabled }}
    >
      {children}
    </AutonomyModeContext.Provider>
  );
}
