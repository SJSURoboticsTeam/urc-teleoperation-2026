import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

  // Latest antenna readings for the sampler below. The antenna objects are
  // replaced every second (delay tick) and on every socket message, so reading
  // them through a ref keeps the sampling interval from restarting each time.
  const latestAntennaRef = useRef({ antenna900, antenna5 });
  useEffect(() => {
    latestAntennaRef.current = { antenna900, antenna5 };
  }, [antenna900, antenna5]);

  // One tick -> one point on every graph. Sampling the time axis and all eight
  // series together keeps them the same length and lined up with each other.
  useEffect(() => {
    if (!running) return;

    const append = (setter, value) =>
      setter((prev) => [...prev, value ?? null].slice(-points)); // negative start parameter counts from end

    const intervalId = setInterval(() => {
      const { antenna900: a900, antenna5: a5 } = latestAntennaRef.current;

      setTime((prev) => {
        const next = prev.length === 0 ? 0 : prev.at(-1) + 1;
        return [...prev, next].slice(-points);
      });
      append(setSignalData900, a900.roverRSSI);
      append(setSignalData5, a5.roverRSSI);
      append(setNoiseData900, a900.noise);
      append(setNoiseData5, a5.noise);
      append(setTxData900, a900.txrate);
      append(setRxData900, a900.rxrate);
      append(setTxData5, a5.txrate);
      append(setRxData5, a5.rxrate);
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

  const resetGraphs = useCallback(
    () => setResetCount((count) => count + 1),
    [],
  );

  // Keep the same value object until one of its parts changes. colors is a
  // module constant and the setters never change, so they stay out of the
  // list. antenna900/antenna5 still change about once a second (delay tick),
  // so readers of this context still re-render at that rate.
  const value = useMemo(
    () => ({
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
    }),
    [
      running,
      points,
      time,
      resetGraphs,
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
    ],
  );

  return (
    <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
  );
};

export default MetricsProvider;
