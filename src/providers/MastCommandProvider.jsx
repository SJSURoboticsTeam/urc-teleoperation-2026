import { MastCommandContext } from "../contexts/MastCommandContext";
import { useCallback, useRef, useState } from "react";

const INITIAL_MAST_COMMANDS = {
  px: 0,
  py: 0,
  wheels_x: 0,
  panSpeed: 50,
};

// Import in App.jsx and wrap around components that need access to it
export default function MastCommandProvider({ children }) {
  const [mastCommands, setMastDisplayCommands] = useState(
    INITIAL_MAST_COMMANDS,
  );
  const mastCommandsRef = useRef(INITIAL_MAST_COMMANDS);
  const panAnglesRef = useRef({ px: 0, py: 0, wheelsx: 0 });

  // Manual changes update both the live command used for TX and the UI.
  const setMastCommands = useCallback((update) => {
    const nextCommands =
      typeof update === "function" ? update(mastCommandsRef.current) : update;

    mastCommandsRef.current = nextCommands;
    setMastDisplayCommands(nextCommands);
  }, []);

  // Gamepad sampling updates the live ref every frame and publishes to the UI
  // separately, so rendering never controls the command transmission rate.
  const publishMastSnapshot = useCallback(() => {
    setMastDisplayCommands(mastCommandsRef.current);
  }, []);

  return (
    <MastCommandContext.Provider
      value={{
        panAnglesRef,
        mastCommands,
        setMastCommands,
        mastCommandsRef,
        publishMastSnapshot,
      }}
    >
      {children}
    </MastCommandContext.Provider>
  );
}
