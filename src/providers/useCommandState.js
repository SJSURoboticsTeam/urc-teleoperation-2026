import { useCallback, useRef, useState } from "react";

// Keep live commands independent of display snapshots. Manual edits update both;
// gamepad sampling writes the ref each frame and publishes state at the UI rate.
export default function useCommandState(initialCommands) {
  const [commands, publishCommands] = useState(initialCommands);
  const commandsRef = useRef(initialCommands);

  const setCommands = useCallback((update) => {
    const next =
      typeof update === "function" ? update(commandsRef.current) : update;
    commandsRef.current = next;
    publishCommands(next);
  }, []);

  return [commands, setCommands, commandsRef, publishCommands];
}
