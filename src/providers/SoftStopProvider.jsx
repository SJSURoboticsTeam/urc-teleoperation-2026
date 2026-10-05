// Provider wrapper used at the app level
import { SoftStopContext } from "../contexts/SoftStopContext";
import { useState } from "react";

// Import in App.jsx and wrap around components that need access to it
export default function SoftStopProvider({ children }) {
  const [softStopActive, setSoftStopActive] = useState(false);
  return (
    <SoftStopContext.Provider value={{ softStopActive, setSoftStopActive }}>
      {children}
    </SoftStopContext.Provider>
  );
}
