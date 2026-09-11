import { createContext, useContext } from "react";

export const MetricsContext = createContext(null);

export function useMetrics() {
  const context = useContext(MetricsContext);
    if (!context) {
        throw new Error("MetricsContext must be used inside MetricsProvider");
    }
  return context;
}