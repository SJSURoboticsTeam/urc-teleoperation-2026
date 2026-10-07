import { createContext, useContext } from "react";

export const ArmCommandContext = createContext(null);

export function useArmCommands() {
  const { armCommands, setArmCommands, armCommandsRef, publishArmCommands } =
    useContext(ArmCommandContext);
  return [armCommands, setArmCommands, armCommandsRef, publishArmCommands];
}
