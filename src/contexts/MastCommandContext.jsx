import { createContext, useContext } from "react";

export const MastCommandContext = createContext(null);

// Import this to use and set mast commands
export function useMastCommands() {
  // pan, tilt, speed
  const { mastCommands, setMastCommands } = useContext(MastCommandContext);
  return [mastCommands, setMastCommands];
}
