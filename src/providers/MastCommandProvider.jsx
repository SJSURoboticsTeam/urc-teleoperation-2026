import { MastCommandContext } from "../contexts/MastCommandContext";
import { useMemo, useState, useRef } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function MastCommandProvider({ children }) {
  const [mastCommands, setMastCommands] = useState({
    px: 0,
    py: 0,
    wheels_x: 0,
    panSpeed: 50,
  });
  const panAnglesRef = useRef({ px: 0, py: 0, wheelsx: 0 });
  // Keep the same value object until mastCommands changes, so a provider
  // re-render alone doesn't re-render every reader. The ref and setter never
  // change identity.
  const value = useMemo(
    () => ({ panAnglesRef, mastCommands, setMastCommands }),
    [mastCommands],
  );
  return (
    <MastCommandContext.Provider value={value}>
      {children}
    </MastCommandContext.Provider>
  );
}
