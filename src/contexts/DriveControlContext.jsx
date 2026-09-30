import { createContext, useContext } from "react";

export const DriveControlContext = createContext(null);

export function useDriveControl() {
  const context = useContext(DriveControlContext);
  if (!context) {
    throw new Error("DriveControlContext must be used inside DriveControlProvider");
  }
  return context;
}
