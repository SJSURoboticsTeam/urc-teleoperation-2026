import { DriveCommandContext } from "../contexts/DriveCommandContext";
import { useCallback, useRef, useState } from "react";

const INITIAL_DRIVE_COMMANDS = {
  sidewaysVelocity: 0,
  forwardsVelocity: 0,
  rotationalVelocity: 0,
  moduleConflicts: 1,
  driveSpeed: 2,
};

// Import in App.jsx and wrap around components that need access to it
export default function DriveCommandProvider({ children }) {
  const [driveCommands, setDriveDisplayCommands] = useState(
    INITIAL_DRIVE_COMMANDS,
  );
  const driveCommandsRef = useRef(INITIAL_DRIVE_COMMANDS);

  // Manual changes update both the live command used for TX and the UI.
  const setDriveCommands = useCallback((update) => {
    const nextCommands =
      typeof update === "function" ? update(driveCommandsRef.current) : update;

    driveCommandsRef.current = nextCommands;
    setDriveDisplayCommands(nextCommands);
  }, []);

  // Gamepad sampling updates the live ref every frame and publishes to the UI
  // separately, so rendering never controls the command transmission rate.
  const publishDriveSnapshot = useCallback(() => {
    setDriveDisplayCommands(driveCommandsRef.current);
  }, []);

  return (
    <DriveCommandContext.Provider
      value={{
        driveCommands,
        setDriveCommands,
        driveCommandsRef,
        publishDriveSnapshot,
      }}
    >
      {children}
    </DriveCommandContext.Provider>
  );
}
