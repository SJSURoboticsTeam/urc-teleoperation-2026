import { ArmCommandContext } from "../contexts/ArmCommandContext";
import { useMemo, useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function ArmCommandProvider({ children }) {
  const [armCommands, setArmCommands] = useState({
    track: 0,
    shoulder: 0,
    elbow: 0,
    pitch: 0,
    roll: 0,
    clamp: 0,
  });
  // Keep the same value object until armCommands changes, so a provider
  // re-render alone doesn't re-render every reader. Setters never change.
  const value = useMemo(
    () => ({ armCommands, setArmCommands }),
    [armCommands],
  );
  return (
    <ArmCommandContext.Provider value={value}>
      {children}
    </ArmCommandContext.Provider>
  );
}
