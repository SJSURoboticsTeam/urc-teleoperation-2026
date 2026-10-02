import { createContext, useContext } from "react";

/**
 * React Context for drive telemetry (wheel angles + measured velocities).
 *
 * Context exists to avoid prop-drilling. The data arrives over socket.io in
 * DriveFeedbackProvider, near the top of the tree in App.jsx, but it is needed
 * by Wheel.jsx and DriveWidget.jsx several layers down. Without context every
 * component in between would have to accept and forward props it never uses.
 *
 * The context/provider split is the convention across this repo (see
 * GPSContext / GPSProvider). It also keeps Vite's Fast Refresh working: a file
 * that exports both a component and a non-component cannot be hot-swapped, so
 * every edit would full-reload the page and drop the socket connection.
 */
export const DriveFeedbackContext = createContext(null);

/**
 * Consumer hook. Returns { wheelAngles, measured, reportedCommand, receive }.
 *
 * Throws rather than returning null so a missing provider reports itself here,
 * instead of surfacing as "cannot read properties of null" inside whichever
 * component happened to render first.
 */
export function useDriveFeedback() {
  const context = useContext(DriveFeedbackContext);

  if (!context) {
    throw new Error("useDriveFeedback must be used inside DriveFeedbackProvider");
  }

  return context;
}
