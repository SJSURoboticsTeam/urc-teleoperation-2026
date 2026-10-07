import { MastCommandContext } from "../contexts/MastCommandContext";
import { useRef } from "react";
import useCommandState from "./useCommandState";

// Import in App.jsx and wrap around components that need access to it
export default function MastCommandProvider({ children }) {
  const [mastCommands, setMastCommands, mastCommandsRef, publishMastCommands] =
    useCommandState({
      px: 0,
      py: 0,
      wheels_x: 0,
      panSpeed: 50,
    });
  const panAnglesRef = useRef({ px: 0, py: 0, wheelsx: 0 });
  return (
    <MastCommandContext.Provider
      value={{ panAnglesRef, mastCommands, setMastCommands, mastCommandsRef, publishMastCommands }}
    >
      {children}
    </MastCommandContext.Provider>
  );
}
