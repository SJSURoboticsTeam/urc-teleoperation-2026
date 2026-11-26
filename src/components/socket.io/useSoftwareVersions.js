import { useEffect, useState, useSyncExternalStore } from "react";
import bundledVersion from "virtual:git-version";
import { basesocket, robotsocket } from "./socket";

let frontendSnapshot = { version: bundledVersion, hotUpdateCount: 0 };
const frontendVersionSubscribers = new Set();
const subscribeToFrontendVersion = (listener) => {
  frontendVersionSubscribers.add(listener);
  return () => frontendVersionSubscribers.delete(listener);
};
const getFrontendVersionSnapshot = () => frontendSnapshot;

if (import.meta.hot) {
  import.meta.hot.accept("virtual:git-version", (module) => {
    if (module) {
      frontendSnapshot = {
        version: module.default,
        hotUpdateCount: frontendSnapshot.hotUpdateCount + 1,
      };
      frontendVersionSubscribers.forEach((listener) => listener());
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
  const { version: frontend, hotUpdateCount: frontendHotUpdateCount } = useSyncExternalStore(
    subscribeToFrontendVersion,
    getFrontendVersionSnapshot,
  );
  const [backends, setBackends] = useState({ robot: disconnected(), base: disconnected() });
  const [connectionCount, setConnectionCount] = useState(0);
  const [dismissedWarning, setDismissedWarning] = useState(null);

  useEffect(() => {
    const cleanups = [["robot", robotsocket], ["base", basesocket]].map(([key, socket]) => {
      let connectionGeneration = 0;
      const setBackendVersion = (value) => setBackends((previous) => ({ ...previous, [key]: value }));
      const onConnect = () => {
        const requestedConnectionGeneration = ++connectionGeneration;
        setBackendVersion({ status: "checking", version: null });
        setConnectionCount((previous) => previous + 1);
        socket.timeout(5000).emit("getVersion", (error, data) => {
          const isCurrentConnection = socket.connected
            && connectionGeneration === requestedConnectionGeneration;
          if (!isCurrentConnection) return;
          const version = normalizeVersion(error ? null : data);
          setBackendVersion({ status: version.sha ? "ready" : "unknown", version });
        });
      };
      const onDisconnect = () => {
        connectionGeneration += 1;
        setBackendVersion(disconnected());
      };
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      if (socket.connected) onConnect();
      return () => {
        connectionGeneration += 1;
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  const connected = Object.values(backends).filter(
    ({ status }) => status !== "disconnected",
  );
  const completed = connected.filter(({ status }) => status !== "checking");
  const versions = [normalizeVersion(frontend), ...completed.map(({ version }) => version)];
  const shas = versions.map((version) => version?.sha).filter(Boolean);
  const mismatch = new Set(shas).size > 1;
  const unverifiable = connected.length > 0 && versions.some((version) => !version?.sha);
  const compatibility =
    connected.length === 0 ? "disconnected"
      : mismatch ? "mismatch"
        : unverifiable ? "unknown"
          : completed.length < connected.length ? "checking"
            : "matching";

  const checkId = `${connectionCount}:${frontendHotUpdateCount}`;
  const isDismissed = dismissedWarning?.checkId === checkId
    && (!mismatch || dismissedWarning.mismatch)
    && (!unverifiable || dismissedWarning.unverifiable);

  return {
    frontend: { status: frontend.sha ? "ready" : "unknown", version: frontend },
    ...backends,
    compatibility,
    warning: {
      open: (mismatch || unverifiable) && !isDismissed,
      mismatch,
      unverifiable,
      dismiss: () => setDismissedWarning({ checkId, unverifiable, mismatch }),
    },
  };
}
