import { createContext, useContext } from "react";

export const MastCommandContext = createContext(null);

// Import this to use and set mast commands
export function useMastCommands() {
  const context = useContext(MastCommandContext);

  if (!context) {
    throw new Error("MastCommandContext must be used inside MastCommandProvider");
  }

  return context;
}
