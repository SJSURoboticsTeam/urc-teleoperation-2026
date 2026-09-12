import { DriveCommandContext } from "../contexts/DriveCommandContext";
import { useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function DriveCommandProvider({ children }) {
  const [driveCommands, setDriveCommands] = useState({
    sidewaysVelocity: 0,
    forwardsVelocity: 0,
    rotationalVelocity: 0,
    moduleConflicts: 1,
    driveSpeed: 2
  });
  return (
    <DriveCommandContext.Provider value={{ driveCommands, setDriveCommands }}>
      {children}
    </DriveCommandContext.Provider>
  );
}
