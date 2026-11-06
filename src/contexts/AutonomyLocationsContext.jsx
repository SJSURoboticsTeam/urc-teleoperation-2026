import { createContext, useContext } from "react";

// Initial state for the two drive locations. lat/lon are the raw text typed into the autonomy pane.
export const initialDriveState = {
  location1: { label: "", lat: "", lon: "", reached: false },
  location2: { label: "", lat: "", lon: "", reached: false },
};

export const AutonomyLocationsContext = createContext(null);

// Import this to read or set the autonomy target locations, e.g. from the autonomy pane or the map.
// Kept separate from AutonomyModeContext so typing coordinates doesn't re-render every pane that checks autonomyEnabled.
export function useAutonomyLocations() {
  const context = useContext(AutonomyLocationsContext);

  if (!context) {
    throw new Error("useAutonomyLocations must be used inside AutonomyLocationsProvider");
  }

  return context;
}
