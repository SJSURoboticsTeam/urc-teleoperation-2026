import { createContext, useContext } from "react";

export const DriveCommandContext = createContext(null);

// Import this to use and set drive commands
export function useDriveCommands() {
  const context = useContext(DriveCommandContext);

  if (!context) {
    throw new Error("DriveCommandContext must be used inside DriveCommandProvider");
  }

  return context;
}
