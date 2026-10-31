import { createContext, useContext } from "react";

export const WaypointsContext = createContext(null);

// Import this to read and change the waypoints shared by the map, science, and autonomy panes
export function useWaypoints() {
  const context = useContext(WaypointsContext);

  if (!context) {
    throw new Error("useWaypoints must be used inside WaypointsProvider");
  }

  return context;
}
