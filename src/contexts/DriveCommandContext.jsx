import { createContext, useContext } from "react";

export const DriveCommandContext = createContext(null);

// Import this to use and set drive commands
export function useDriveCommands() {
  // lx, ly, rx, moduleConflicts
  const { driveCommands, setDriveCommands, driveCommandsRef, publishDriveCommands } =
    useContext(DriveCommandContext);
  return [driveCommands, setDriveCommands, driveCommandsRef, publishDriveCommands];
}
