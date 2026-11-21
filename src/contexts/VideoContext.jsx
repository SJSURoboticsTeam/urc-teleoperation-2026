import { createContext, useContext } from "react";

export const VideoContext = createContext(null);

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo needs a VideoProvider");
  }
  return context;
}