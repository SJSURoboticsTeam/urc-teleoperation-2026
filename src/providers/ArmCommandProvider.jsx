import { ArmCommandContext } from "../contexts/ArmCommandContext";
import useCommandState from "./useCommandState";

// Import in App.jsx and wrap around components that need access to it
export default function ArmCommandProvider({ children }) {
  const [armCommands, setArmCommands, armCommandsRef, publishArmCommands] =
    useCommandState({
      track: 0,
      shoulder: 0,
      elbow: 0,
      pitch: 0,
      roll: 0,
      clamp: 0,
    });
  return (
    <ArmCommandContext.Provider
      value={{ armCommands, setArmCommands, armCommandsRef, publishArmCommands }}
    >
      {children}
    </ArmCommandContext.Provider>
  );
}
