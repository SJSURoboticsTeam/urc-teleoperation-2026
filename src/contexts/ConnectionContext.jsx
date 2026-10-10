// Add by Sunny_100226

import { createContext, useContext } from "react";

// Stores shared connection status for the robot and base-pi services.
export const ConnectionContext = createContext(undefined);

// Allows components to read connection status without creating duplicate socket listeners.
export function useConnectionStatus() {
  const context = useContext(ConnectionContext);

  // Ensure this hook is only used inside ConnectionProvider.
  if (context === undefined) {
    throw new Error(
      "useConnectionStatus must be used inside ConnectionProvider",
    );
  }

  return context;
}