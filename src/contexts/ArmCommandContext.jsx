import { createContext, useContext } from "react";

export const ArmCommandContext = createContext(null);

export function useArmCommands() {
  const context = useContext(ArmCommandContext);

  if (!context) {
    throw new Error("ArmCommandContext must be used inside ArmCommandProvider");
  }

  return context;
}
