import { createContext, useContext } from "react";

export const SerialContext = createContext(null);

export function useSerial() {
  const context = useContext(SerialContext);

  if (!context) {
    throw new Error("usePeripherals must be used inside SerialProvider");
  }

  return context;
}
