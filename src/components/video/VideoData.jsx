import { basesocket } from "../socket.io/socket";
import { useState, useEffect } from "react";

const emptyStats = { status: "UNAVAILABLE", droppedPerSec: null };

export function useVideoData() {
  const [videoStats, setVideoStats] = useState({
    mast: emptyStats,
    wheels: emptyStats,
    arm1: emptyStats,
    arm2: emptyStats,
    science: emptyStats,
  });

  useEffect(() => {
    const handler = (data) => {
      setVideoStats(data);
    };

    basesocket.on("videostats", handler);

    return () => {
      basesocket.off("videostats", handler);
    };
  }, []);

  return videoStats;
}