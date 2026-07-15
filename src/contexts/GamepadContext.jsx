import { createContext, useContext } from "react";

export const GamepadContext = createContext(null);

// Import this to use and set connected gamepads
export function useConnectedGamepads() {
  const { connectedGamepads, setConnectedGamepads } =
    useContext(GamepadContext);
  return [connectedGamepads, setConnectedGamepads];
}
