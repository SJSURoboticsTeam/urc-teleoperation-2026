import { useState, useEffect } from "react";
import { useSnackbar } from "notistack";
import { robotsocket } from "../components/socket.io/socket";
import { DriveControlContext } from "../contexts/DriveControlContext";

// lite/demo modes have no backend to enforce the lock, so treat control as granted (D11)
const offlineMode =
  import.meta.env.MODE === "lite" || import.meta.env.MODE === "demo";

export const DriveControlProvider = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [controllerSid, setControllerSid] = useState(null);
  const [mySid, setMySid] = useState(robotsocket.id ?? null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const pullDriveControl = () => {
      robotsocket.emit("getDriveControl", (data) => {
        setControllerSid(data.controllerSid);
      });
    };

    const onDriveControlState = (data) => {
      setControllerSid(data.controllerSid);
    };

    const onConnect = () => {
      setMySid(robotsocket.id);
      pullDriveControl();
    };

    const onDisconnect = () => {
      setMySid(null);
      setControllerSid(null);
    };

    robotsocket.on("driveControlState", onDriveControlState);
    robotsocket.on("connect", onConnect);
    robotsocket.on("disconnect", onDisconnect);

    // cover the case where the socket connected before this effect ran
    if (robotsocket.connected) {
      onConnect();
    }

    return () => {
      robotsocket.off("driveControlState", onDriveControlState);
      robotsocket.off("connect", onConnect);
      robotsocket.off("disconnect", onDisconnect);
    };
  }, []);

  const hasControl = offlineMode || (!!mySid && controllerSid === mySid);
  const controlledByOther = !!controllerSid && controllerSid !== mySid;

  const requestControl = () => {
    if (pending) return;
    setPending(true);
    robotsocket.timeout(3000).emit("requestDriveControl", (err, res) => {
      setPending(false);
      if (err) {
        enqueueSnackbar("Take control request timed out.", { variant: "error" });
        return;
      }
      if (res.status === "DENIED") {
        enqueueSnackbar("Another station is already driving.", { variant: "warning" });
      }
      // controllerSid updates from the driveControlState broadcast/pull, not here (single source of truth)
    });
  };

  const releaseControl = () => {
    if (pending) return;
    setPending(true);
    robotsocket.timeout(3000).emit("releaseDriveControl", (err, res) => {
      setPending(false);
      if (err) {
        enqueueSnackbar("Release control timed out.", { variant: "error" });
        return;
      }
      if (res.status === "ERROR") {
        enqueueSnackbar("You weren't in control.", { variant: "warning" });
      }
    });
  };

  const value = {
    controllerSid,
    hasControl,
    controlledByOther,
    pending,
    offlineMode,
    requestControl,
    releaseControl,
  };

  return (
    <DriveControlContext.Provider value={value}>
      {children}
    </DriveControlContext.Provider>
  );
};

export default DriveControlProvider;
