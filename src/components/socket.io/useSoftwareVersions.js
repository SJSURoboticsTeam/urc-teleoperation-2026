import { useEffect, useState, useSyncExternalStore } from "react";
import bundledVersion from "virtual:git-version";
import { basesocket, robotsocket } from "./socket";

let frontendSnapshot = { version: bundledVersion, revision: 0 };
const subscribers = new Set();
const subscribe = (listener) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};
const getFrontendSnapshot = () => frontendSnapshot;

if (import.meta.hot) {
  import.meta.hot.accept("virtual:git-version", (module) => {
    if (module) {
      frontendSnapshot = { version: module.default, revision: frontendSnapshot.revision + 1 };
      subscribers.forEach((listener) => listener());
    }
  });
}

const disconnected = () => ({ status: "disconnected", version: null });

function normalizeVersion(data) {
  const text = (value) => (typeof value === "string" ? value : null);
  const sha = text(data?.sha);
  return {
    sha: /^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(sha ?? "") ? sha.toLowerCase() : null,
    branch: text(data?.branch),
    message: text(data?.message),
  };
}

export default function useSoftwareVersions() {
  const { version: frontend, revision: frontendRevision } = useSyncExternalStore(
    subscribe,
    getFrontendSnapshot,
  );
  const [backends, setBackends] = useState({ robot: disconnected(), base: disconnected() });
  const [checkNumber, setCheckNumber] = useState(0);

  useEffect(() => {
    const cleanups = [["robot", robotsocket], ["base", basesocket]].map(([key, socket]) => {
      let generation = 0;
      const update = (value) => setBackends((previous) => ({ ...previous, [key]: value }));
      const onConnect = () => {
        const requestGeneration = ++generation;
        update({ status: "checking", version: null });
        setCheckNumber((previous) => previous + 1);
        socket.timeout(5000).emit("getVersion", (error, data) => {
          if (generation !== requestGeneration || !socket.connected) return;
          const version = normalizeVersion(error ? null : data);
          update({ status: version.sha ? "ready" : "unknown", version });
        });
      };
      const onDisconnect = () => {
        generation += 1;
        update(disconnected());
      };
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      if (socket.connected) onConnect();
      return () => {
        generation += 1;
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  const connected = Object.values(backends).filter(
    ({ status }) => status !== "disconnected",
  );
  const versions = [normalizeVersion(frontend), ...connected.map(({ version }) => version)];
  const shas = versions.map((version) => version?.sha).filter(Boolean);

  return {
    frontend: { status: frontend.sha ? "ready" : "unknown", version: frontend },
    ...backends,
    checking: connected.some(({ status }) => status === "checking"),
    mismatch: new Set(shas).size > 1,
    unverifiable: connected.length > 0 && versions.some((version) => !version?.sha),
    checkKey: `${checkNumber}:${frontendRevision}`,
  };
}
