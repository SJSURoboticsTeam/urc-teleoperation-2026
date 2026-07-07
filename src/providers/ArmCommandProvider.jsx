import { ArmCommandContext } from "../contexts/ArmCommandContext";

// Import in App.jsx and wrap around components that need access to it
export default function ArmCommandProvider({
  armCommands,
  setArmCommands,
  children,
}) {
  return (
    <ArmCommandContext.Provider value={{ armCommands, setArmCommands }}>
      {children}
    </ArmCommandContext.Provider>
  );
}