import { MastCommandContext } from "../contexts/MastCommandContext";
import { useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function MastCommandProvider({ children }) {
  const [mastCommands, setMastCommands] = useState({
    px: 0,
    py: 0,
    wheels_x: 0,
    panSpeed: 50,
  });
  return (
    <MastCommandContext.Provider value={{ mastCommands, setMastCommands }}>
      {children}
    </MastCommandContext.Provider>
  );
}
