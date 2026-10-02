import { createContext, useContext } from "react";

export const DriveFeedbackContext = createContext(null);

// Import this to read wheel angles and measured drive velocities
export function useDriveFeedback() {
  const context = useContext(DriveFeedbackContext);

  if (!context) {
    throw new Error("useDriveFeedback must be used inside DriveFeedbackProvider");
  }

  return context;
}
