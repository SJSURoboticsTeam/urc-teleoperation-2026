import { useCallback, useRef, useState } from "react";

export default function useArmMimicSerial({ onLine } = {}) {
  const [isSupported] = useState(() => "serial" in navigator);
  const [isConnected, setIsConnected] = useState(false);

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const keepReadingRef = useRef(false);

  const readLoop = useCallback(
    async (port) => {
      const decoder = new TextDecoderStream();
      const readableClosed = port.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();

      readerRef.current = reader;
      keepReadingRef.current = true;

      let buffer = "";

      try {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          buffer += value;

          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            console.log("[Arm Mimic Serial]", trimmed);
            onLine?.(trimmed);
          });
        }
      } catch (err) {
        console.error("Arm Mimic read error:", err);
      } finally {
        reader.releaseLock();
        await readableClosed.catch(() => {});
      }
    },
    [onLine],
  );

  const connect = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const port = await navigator.serial.requestPort();

      await port.open({
        baudRate: 115200,
      });

      portRef.current = port;

      const encoder = new TextEncoderStream();
      encoder.readable.pipeTo(port.writable);
      writerRef.current = encoder.writable.getWriter();

      setIsConnected(true);
      readLoop(port);

      return true;
    } catch (err) {
      console.error("Arm Mimic connect error:", err);
      setIsConnected(false);
      return false;
    }
  }, [isSupported, readLoop]);

  const disconnect = useCallback(async () => {
    try {
      keepReadingRef.current = false;

      if (readerRef.current) {
        await readerRef.current.cancel().catch(() => {});
        readerRef.current = null;
      }

      if (writerRef.current) {
        await writerRef.current.close().catch(() => {});
        writerRef.current = null;
      }

      if (portRef.current) {
        await portRef.current.close().catch(() => {});
        portRef.current = null;
      }

      setIsConnected(false);
    } catch (err) {
      console.error("Arm Mimic disconnect error:", err);
    }
  }, []);

  const writeLine = useCallback(async (line) => {
    if (!writerRef.current) return;

    try {
      await writerRef.current.write(`${line}\n`);
    } catch (err) {
      console.error("Arm Mimic write error:", err);
    }
  }, []);

  return {
    isSupported,
    isConnected,
    connect,
    disconnect,
    writeLine,
  };
}
