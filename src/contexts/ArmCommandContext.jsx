import { createContext, useContext } from "react";

export const ArmCommandContext = createContext(null);

// Import in App.jsx and wrap around components that need access to it
export function useArmCommands() {
  const { armCommands, setArmCommands } = useContext(ArmCommandContext);
  return [armCommands, setArmCommands];
}
