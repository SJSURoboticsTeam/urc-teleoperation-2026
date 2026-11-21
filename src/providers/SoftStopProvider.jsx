// Provider wrapper used at the app level
import { SoftStopContext } from "../contexts/SoftStopContext";
import { useEffect, useState } from "react";
import { robotsocket } from "../components/socket.io/socket";

// Import in App.jsx and wrap around components that need access to it
export default function SoftStopProvider({ children }) {
  const [softStopActive, setSoftStopActive] = useState(false);

  useEffect(() => {
    // Server is the single source of truth: every client (not just the one
    // that clicked the button) syncs from this broadcast.
    robotsocket.on("softStopChanged", setSoftStopActive);
    return () => {
      robotsocket.off("softStopChanged", setSoftStopActive);
    };
  }, []);

  return (
    <SoftStopContext.Provider value={{ softStopActive, setSoftStopActive }}>
      {children}
    </SoftStopContext.Provider>
  );
}
