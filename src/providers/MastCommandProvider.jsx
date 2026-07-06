import { MastCommandContext } from "../contexts/MastCommandContext";
// Import in App.jsx and wrap around components that need access to it
export default function MastCommandProvider({
  mastCommands,
  setMastCommands,
  children,
}) {
  return (
    <MastCommandContext.Provider value={{ mastCommands, setMastCommands }}>
      {children}
    </MastCommandContext.Provider>
  );
}
