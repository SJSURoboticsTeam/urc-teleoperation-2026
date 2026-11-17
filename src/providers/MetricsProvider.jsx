import { useState, useEffect, useRef } from "react";
import { MetricsContext } from "../contexts/MetricsContext";
import { useAntennaData } from "../components/metrics/antennaData";
import { useVideoData } from "../components/video/VideoData";

const colors = {
  "900": "#fe2a1a",
  "900-alt": "#ebd400",
  "5": "#2522f6",
  "5-alt": "#00e1e1",
};

// one line per camera on the dropped-frames graph (names match base-pi/video.py)
const cameraColors = {
  mast: "#fe2a1a",
  wheels: "#2522f6",
  arm1: "#ebd400",
  arm2: "#00e1e1",
  science: "#8e24aa",
};
const emptyDroppedData = () =>
  Object.fromEntries(Object.keys(cameraColors).map((name) => [name, []]));

export const MetricsProvider = ({ children }) => {
  const [running, setRunning] = useState(false);
  const [points, setPoints] = useState(10);
  const [resetCount, setResetCount] = useState(0);
  const [time, setTime] = useState([]);

  const [signalData900, setSignalData900] = useState([]);
  const [signalData5, setSignalData5] = useState([]);
  const [noiseData900, setNoiseData900] = useState([]);
  const [noiseData5, setNoiseData5] = useState([]);
  const [txData900, setTxData900] = useState([]);
  const [rxData900, setRxData900] = useState([]);
  const [txData5, setTxData5] = useState([]);
  const [rxData5, setRxData5] = useState([]);

  const [antenna900, antenna5] = useAntennaData();
  const [droppedData, setDroppedData] = useState(emptyDroppedData);
  const videoStats = useVideoData();
  const videoStatsRef = useRef(videoStats);
  useEffect(() => {
    videoStatsRef.current = videoStats;
  }, [videoStats]);

  useEffect(() => {
    if (!running) return;

    const intervalId = setInterval(() => {
      setTime((prev) => {
        const next = prev.length === 0 ? 0 : prev.at(-1) + 1;
        return [...prev, next].slice(-points);
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [running, points]);

  useEffect(() => {
    setTime([]);
    setSignalData900([]);
    setSignalData5([]);
    setNoiseData900([]);
    setNoiseData5([]);
    setTxData900([]);
    setRxData900([]);
    setTxData5([]);
    setRxData5([]);
    setDroppedData(emptyDroppedData());
  }, [resetCount]);

  useEffect(() => {
    if (!running) return;

    setSignalData900((prev) => [...prev, antenna900.roverRSSI ?? null].slice(-points));
    setSignalData5((prev) => [...prev, antenna5.roverRSSI ?? null].slice(-points));
  }, [time, running, antenna900, antenna5, points]);

  useEffect(() => {
    if (!running) return;

    setNoiseData900((prev) => [...prev, antenna900.noise ?? null].slice(-points));
    setNoiseData5((prev) => [...prev, antenna5.noise ?? null].slice(-points));
  }, [time, running, antenna900, antenna5, points]);

  useEffect(() => {
    if (!running) return;

    setTxData900((prev) => [...prev, antenna900.txrate ?? null].slice(-points));
    setRxData900((prev) => [...prev, antenna900.rxrate ?? null].slice(-points));
  }, [time, running, antenna900, points]);

  useEffect(() => {
    if (!running) return;

    setTxData5((prev) => [...prev, antenna5.txrate ?? null].slice(-points));
    setRxData5((prev) => [...prev, antenna5.rxrate ?? null].slice(-points));
  }, [time, running, antenna5, points]);
  
  useEffect(() => {
    if (!running) return;
    setDroppedData((prev) =>
      Object.fromEntries(
        Object.keys(prev).map((name) => [
          name,
          [...prev[name], videoStatsRef.current[name]?.droppedPerSec ?? null].slice(-points),
        ]),
      ),
    );
  }, [time]);

  const resetGraphs = () => setResetCount((count) => count + 1);

  const value = {
    running,
    setRunning,
    points,
    setPoints,
    time,
    resetGraphs,
    colors,
    cameraColors,
    droppedData,
    antenna900,
    antenna5,
    signalData900,
    signalData5,
    noiseData900,
    noiseData5,
    txData900,
    rxData900,
    txData5,
    rxData5,
  };

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
};

export default MetricsProvider;
