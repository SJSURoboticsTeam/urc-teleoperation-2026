import { createContext, useContext } from "react";

export const ScienceContext = createContext(null);

export function useScience() {
  const context = useContext(ScienceContext);
  if (!context) {
    throw new Error("ScienceContext must be used inside ScienceProvider");
  }
  return context;
}
