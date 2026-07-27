import { createContext, useContext } from "react";

export const PeripheralContext = createContext(null);

export function usePeripherals() {
  const context = useContext(PeripheralContext);

  if (!context) {
    throw new Error("usePeripherals must be used inside PeripheralProvider");
  }

  return context;
}
