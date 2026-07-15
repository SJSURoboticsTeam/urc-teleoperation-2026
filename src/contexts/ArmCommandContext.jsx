import { createContext, useContext } from "react";

export const ArmCommandContext = createContext(null);

export function useArmCommands() {
  const { armCommands, setArmCommands } = useContext(ArmCommandContext);
  return [armCommands, setArmCommands];
}
