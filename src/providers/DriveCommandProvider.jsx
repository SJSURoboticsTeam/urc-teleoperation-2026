import { DriveCommandContext } from "../contexts/DriveCommandContext";
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
