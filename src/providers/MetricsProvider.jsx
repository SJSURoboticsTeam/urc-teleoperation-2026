import { useState, useEffect } from "react";
import { MetricsContext } from "../contexts/MetricsContext";
import { useAntennaData } from "../components/metrics/antennaData";

const colors = {
  "900": "#fe2a1a",
  "900-alt": "#ebd400",
  "5": "#2522f6",
  "5-alt": "#00e1e1",
};

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

  const resetGraphs = () => setResetCount((count) => count + 1);

  const value = {
    running,
    setRunning,
    points,
    setPoints,
    time,
    resetGraphs,
    colors,
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
