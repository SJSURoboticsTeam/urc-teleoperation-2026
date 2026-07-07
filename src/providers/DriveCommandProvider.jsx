import { DriveCommandContext } from "../contexts/DriveCommandContext";

// Import in App.jsx and wrap around components that need access to it
export default function DriveCommandProvider({
  driveCommands,
  setDriveCommands,
  children,
}) {
  return (
    <DriveCommandContext.Provider value={{ driveCommands, setDriveCommands }}>
      {children}
    </DriveCommandContext.Provider>
  );
}
