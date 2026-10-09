import { ArmCommandContext } from "../contexts/ArmCommandContext";
import { useCallback, useRef, useState } from "react";

const INITIAL_ARM_COMMANDS = {
  track: 0,
  shoulder: 0,
  elbow: 0,
  pitch: 0,
  roll: 0,
  clamp: 0,
};

// Import in App.jsx and wrap around components that need access to it
export default function ArmCommandProvider({ children }) {
  const [armCommands, setArmDisplayCommands] = useState(INITIAL_ARM_COMMANDS);
  const armCommandsRef = useRef(INITIAL_ARM_COMMANDS);

  // Slider changes update both the live command used for TX and the UI.
  const setArmCommands = useCallback((update) => {
    const nextCommands =
      typeof update === "function" ? update(armCommandsRef.current) : update;

    armCommandsRef.current = nextCommands;
    setArmDisplayCommands(nextCommands);
  }, []);

  // Gamepad sampling updates the live ref every frame and publishes to the UI
  // separately, so rendering never controls the command transmission rate.
  const publishArmSnapshot = useCallback(() => {
    setArmDisplayCommands(armCommandsRef.current);
  }, []);

  return (
    <ArmCommandContext.Provider
      value={{
        armCommands,
        setArmCommands,
        armCommandsRef,
        publishArmSnapshot,
      }}
    >
      {children}
    </ArmCommandContext.Provider>
  );
}
