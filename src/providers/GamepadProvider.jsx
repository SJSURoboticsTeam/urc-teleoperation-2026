import { GamepadContext } from "../contexts/GamepadContext";
import { useMemo, useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function GamepadProvider({ children }) {
  const [connectedGamepads, setConnectedGamepads] = useState({
    driveGPList: [], // list of drive gamepads (to display)
    armGPList: [], // list of arm gamepads (to display)
    drive: null, // index of selected drive gamepad
    arm: null, // index of selected arm gamepad
  });
  // Keep the same value object until connectedGamepads changes, so a provider
  // re-render alone doesn't re-render every reader. Setters never change.
  const value = useMemo(
    () => ({ connectedGamepads, setConnectedGamepads }),
    [connectedGamepads],
  );
  return (
    <GamepadContext.Provider value={value}>
      {children}
    </GamepadContext.Provider>
  );
}
