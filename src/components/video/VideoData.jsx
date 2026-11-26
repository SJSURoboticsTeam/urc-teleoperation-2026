import { basesocket } from "../socket.io/socket";
import { useState, useEffect } from "react";

const emptyStats = { status: "UNAVAILABLE", droppedPerSec: null };

const allUnavailable = {
  mast: emptyStats,
  wheels: emptyStats,
  scout: emptyStats,
  feet: emptyStats,
  module1: emptyStats,
  module2: emptyStats,
};

export function useVideoData() {
  const [videoStats, setVideoStats] = useState(allUnavailable);

  useEffect(() => {
    const handler = (data) => {
      setVideoStats(data);
    };

    const handleDisconnect = () => {
      setVideoStats(allUnavailable);
    };
    
    basesocket.on("videostats", handler);
    basesocket.on("disconnect", handleDisconnect);

    return () => {
      basesocket.off("videostats", handler);
      basesocket.off("disconnect", handleDisconnect);
    };
  }, []);

  return videoStats;
}