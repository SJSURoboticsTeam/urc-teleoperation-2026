import { GamepadContext } from "../contexts/GamepadContext";

// Import in App.jsx and wrap around components that need access to it
export default function GamepadProvider({
  connectedGamepads,
  setConnectedGamepads,
  children,
}) {
  return (
    <GamepadContext.Provider
      value={{ connectedGamepads, setConnectedGamepads }}
    >
      {children}
    </GamepadContext.Provider>
  );
}
