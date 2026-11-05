import { createContext, useContext } from "react";

export const ScienceContext = createContext(null);

// Import this to read or set the science site locations, e.g. from the science pane or the map
export function useScience() {
  const context = useContext(ScienceContext);

  if (!context) {
    throw new Error("useScience must be used inside ScienceProvider");
  }

  return context;
}
