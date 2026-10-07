import { DriveCommandContext } from "../contexts/DriveCommandContext";
import useCommandState from "./useCommandState";

// Import in App.jsx and wrap around components that need access to it
export default function DriveCommandProvider({ children }) {
  const [driveCommands, setDriveCommands, driveCommandsRef, publishDriveCommands] =
    useCommandState({
      sidewaysVelocity: 0,
      forwardsVelocity: 0,
      rotationalVelocity: 0,
      moduleConflicts: 1,
      driveSpeed: 2,
    });
  return (
    <DriveCommandContext.Provider
      value={{ driveCommands, setDriveCommands, driveCommandsRef, publishDriveCommands }}
    >
      {children}
    </DriveCommandContext.Provider>
  );
}
