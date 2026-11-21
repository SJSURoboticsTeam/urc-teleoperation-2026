import { DriveCommandContext } from "../contexts/DriveCommandContext";
import { useMemo, useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function DriveCommandProvider({ children }) {
  const [driveCommands, setDriveCommands] = useState({
    sidewaysVelocity: 0,
    forwardsVelocity: 0,
    rotationalVelocity: 0,
    moduleConflicts: 1,
    driveSpeed: 2
  });
  // Keep the same value object until driveCommands changes, so a provider
  // re-render alone doesn't re-render every reader. Setters never change.
  const value = useMemo(
    () => ({ driveCommands, setDriveCommands }),
    [driveCommands],
  );
  return (
    <DriveCommandContext.Provider value={value}>
      {children}
    </DriveCommandContext.Provider>
  );
}
