import { createContext, useContext } from "react";

export const GPSContext = createContext(null);

// Import this to use and set connected gamepads
export function useGPS() {
  const context = useContext(GPSContext);

  if (!context) {
    throw new Error("useGPS must be used inside GPSProvider");
  }

  return context;
}
