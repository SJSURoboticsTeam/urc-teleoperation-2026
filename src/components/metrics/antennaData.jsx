import { basesocket } from "../socket.io/socket";
import { useState, useEffect, useRef } from "react";


export function useAntennaData() {
  const [antenna900, setantennadata900] = useState({
    status: "NO DATA YET",
    roverRSSI: null,
    txrate: null,
    rxrate: null,
    noise: null,
    freq: null,
    freqw: null,
    delay: null,
  });
  const [antenna5, setantennadata5] = useState({
    status: "NO DATA YET",
    roverRSSI: null,
    txrate: null,
    rxrate: null,
    noise: null,
    freq: null,
    freqw: null,
    delay: null,
  });

  const timestamp900 = useRef(0);
  const timestamp5 = useRef(0);

  //900 mhz
  useEffect(() => {
    let interval;
    // calculate the delay from the previous message, and update this every second
    function checkLatency5() {
      setantennadata900((prev) => ({
        ...prev,
        delay: Math.round(((Date.now() - timestamp900.current) / 1000))
      }));
    }
    interval = setInterval(checkLatency5, 1000);
    return () => clearInterval(interval);
  }, []);

    //5 ghz
  useEffect(() => {
    let interval;
    // calculate the delay from the previous message, and update this every second
    function checkLatency5() {
      setantennadata5((prev) => ({
        ...prev,
        delay: Math.round(((Date.now() - timestamp5.current) / 1000) )
      }));
    }
    interval = setInterval(checkLatency5, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler900 = (data) => {
      // console.log("antenna data:", data);
      setantennadata900( (prev) => ({
        ...prev,
        status: data.status,
        roverRSSI: data.dbm,
        txrate: data.txrate,
        rxrate: data.rxrate,
        noise: data.noise,
        freq: data.freq,
        freqw: data.freqwidth,
      }));
      timestamp900.current = Date.now();
    };

    const handler5 = (data) => {
      // console.log("antenna data:", data);
      setantennadata5( (prev) => ({
        ...prev,
        status: data.status,
        roverRSSI: data.dbm,
        txrate: data.txrate,
        rxrate: data.rxrate,
        noise: data.noise,
        freq: data.freq,
        freqw: data.freqwidth,
      }));
      timestamp5.current = Date.now();
    };

    basesocket.on("antennastats900", handler900);
    basesocket.on("antennastats5", handler5);

    return () => {
      basesocket.off("antennastats900", handler900); // cleanup so no duplicate listeners
      basesocket.off("antennastats5", handler5); // cleanup so no duplicate listeners
    };
  }, []);

  return [antenna900, antenna5];
}