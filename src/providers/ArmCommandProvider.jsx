import { ArmCommandContext } from "../contexts/ArmCommandContext";
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