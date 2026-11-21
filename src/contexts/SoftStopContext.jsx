import { createContext, useContext } from "react";

// Global context used to share whether Soft Stop (recoverable pause) is active
export const SoftStopContext = createContext({
  softStopActive: false,
  setSoftStopActive: () => {},
});

// Hook/function for consuming Soft Stop state
export function useSoftStop() {
  return useContext(SoftStopContext);
}
