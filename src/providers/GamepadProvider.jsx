import { GamepadContext } from "../contexts/GamepadContext";
import { useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function GamepadProvider({ children }) {
  const [connectedGamepads, setConnectedGamepads] = useState({
    driveGPList: [], // list of drive gamepads (to display)
    armGPList: [], // list of arm gamepads (to display)
    drive: null, // index of selected drive gamepad
    arm: null, // index of selected arm gamepad
  });
  return (
    <GamepadContext.Provider
      value={{ connectedGamepads, setConnectedGamepads }}
    >
      {children}
    </GamepadContext.Provider>
  );
}
