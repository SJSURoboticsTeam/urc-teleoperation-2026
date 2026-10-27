import { useState, useEffect, useCallback, useRef } from "react";
import { useSnackbar } from "notistack";
import { robotsocket } from "../components/socket.io/socket";
import { PeripheralContext } from "../contexts/PeripheralContext";
import Button from "@mui/material/Button";

function ReconnectAction({
  snackbarId,
  disconnectDrive,
  connectDrive,
  disconnectArm,
  connectArm,
  clearCanWarning,
  canId,
}) {
  const [loading, setLoading] = useState(false);

  const handleReconnect = async () => {
    setLoading(true);

    try {
      if (canId === "drive") {
        await disconnectDrive();
        await connectDrive();
      } else if (canId === "arm") {
        await disconnectArm();
        await connectArm();
      } else {
        throw new Error(`Unknown CAN target: ${canId}`);
      }
      clearCanWarning(canId, snackbarId);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      loading={loading}
      onClick={handleReconnect}
      sx={{
        color: "white",
        borderColor: "white",
        "&:hover": {
          borderColor: "white",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        },
      }}
    >
      Reconnect
    </Button>
  );
}

export const PeripheralProvider = ({ children }) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const [servercanState, setservercanState] = useState({
    driveState: "idle", // idle, connecting, active
    armState: "idle", // idle, connecting, active
    scienceState: "idle", // idle, connecting, active
    gpsState: "idle", // idle, connecting, active
    uartMode: "CAN/UART", // CAN/UART (??? state), CAN, UART
    loading: true, // lock buttons, dropdowns when refreshing can data
    canIds: [], // array with every possible serial device
    driveId: "disconnect", // selected can id in dropdown or disconnect
    armId: "disconnect", // selected can id in dropdown or disconnect
    scienceId: "disconnect", // selected can id in dropdown or disconnect
    gpsId: "disconnect", // selected can id in dropdown or disconnect
  });

    const [basecanState, setbasecanState] = useState({
    rotationState: "idle", // idle, connecting, active
    loading: true, // lock buttons, dropdowns when refreshing can data
    canIds: [], // array with every possible serial device
    rotationId: "disconnect", // selected can id in dropdown or disconnect
  });

  const canWarningSnackbarIds = useRef(new Map());
  const previousCanIds = useRef({
    drive: servercanState.driveId,
    arm: servercanState.armId,
  });
  const clearCanWarning = useCallback(
    (canId, fallbackSnackbarId) => {
      console.log("Logged CAN ID" + canId);
      const snackbarId =
        canWarningSnackbarIds.current.get(canId) ?? fallbackSnackbarId;

      if (snackbarId !== undefined) {
        closeSnackbar(snackbarId);
      }
      canWarningSnackbarIds.current.delete(canId);
    },
    [closeSnackbar],
  );

  useEffect(() => {
    const currentCanIds = {
      drive: servercanState.driveId,
      arm: servercanState.armId,
    };

    // Centralize warning cleanup so every source of a CAN ID change is covered.
    for (const canId of ["drive", "arm"]) {
      if (previousCanIds.current[canId] !== currentCanIds[canId]) {
        clearCanWarning(canId);
      }
    }
    previousCanIds.current = currentCanIds;
  }, [servercanState.armId, servercanState.driveId, clearCanWarning]);

  const requestCanInfo = useCallback(() => {
    // lock the ui so user can't do anything while loading
    console.log("Refresh requested...");
    setservercanState((prev) => ({
      ...prev,
      loading: true,
    }));
    robotsocket.emit("getCanInfo", (data) => {
      //console.log(data);
      setservercanState((prev) => ({
        ...prev,
        canIds: data["canIds"],
        driveId: data["driveId"],
        armId: data["armId"],
        scienceId: data["scienceId"],
        gpsId: data["gpsId"],
        uartMode: data["uartMode"],
        // assignment if connected or not by text
        driveState: data["driveId"] !== "disconnect" ? "active" : "idle",
        armState: data["armId"] !== "disconnect" ? "active" : "idle",
        scienceState: data["scienceId"] !== "disconnect" ? "active" : "idle",
        gpsState: data["gpsId"] !== "disconnect" ? "active" : "idle",
        loading: false,
      }));
    });
  }, []);

  useEffect(() => {
    // when one client updates data, other clients get asked to refresh data
    const updateCan = () => {
      console.log("Refreshing CAN state");
      clearCanWarning("drive");
      clearCanWarning("arm");
      requestCanInfo();
    };
    robotsocket.on("forcecanrefresh", updateCan);
    robotsocket.on("connect", updateCan);

    return () => {
      robotsocket.off("forcecanrefresh", updateCan);
      robotsocket.off("connect", updateCan);
    };
  }, [requestCanInfo, clearCanWarning]);

  const connectDrive = useCallback(() => {
    setservercanState((prev) => ({
      ...prev,
      driveState: "connecting",
    }));
    clearCanWarning("drive");
    return new Promise((resolve, reject) => {
      console.log("Connecting Drive, Sending id " + servercanState.driveId);
      robotsocket.emit("connectDrive", servercanState.driveId, (response) => {
        console.log("RESPONSE:" + response);
        if (response === "OK") {
          setservercanState((prev) => ({
            ...prev,
            driveState: "active",
          }));
          resolve();
        } else {
          enqueueSnackbar("Drive didn't connect. Refreshing...", {
            variant: "error",
          });
          requestCanInfo();
          reject(new Error("Drive connection failed"));
        }
      });
    });
  }, [servercanState.driveId, clearCanWarning, enqueueSnackbar, requestCanInfo]);

  const disconnectDrive = useCallback(() => {
    setservercanState((prev) => ({
      ...prev,
      driveState: "connecting",
    }));
    clearCanWarning("drive");
    return new Promise((resolve, reject) => {
      console.log("Disconnecting drive");
      robotsocket.emit("disconnectDrive", (response) => {
        console.log("RESPONSE:" + response);
        if (response === "OK") {
          setservercanState((prev) => ({
            ...prev,
            driveState: "idle",
          }));
          resolve();
        } else {
          enqueueSnackbar("Drive didn't disconnect. Refreshing...", {
            variant: "error",
          });
          requestCanInfo();
          reject(new Error("Drive disconnection failed"));
        }
      });
    });
  }, [enqueueSnackbar, clearCanWarning, requestCanInfo]);

  const connectArm = useCallback(() => {
    return new Promise((resolve, reject) => {
      setservercanState((prev) => ({
        ...prev,
        armState: "connecting",
      }));
      clearCanWarning("arm");
      console.log("Connecting Arm, Sending id " + servercanState.armId);
      robotsocket.emit("connectArm", servercanState.armId, (response) => {
        console.log("RESPONSE:" + response);
        if (response === "OK") {
          setservercanState((prev) => ({
            ...prev,
            armState: "active",
          }));
          resolve();
        } else {
          enqueueSnackbar("Arm didn't connect. Refreshing...", {
            variant: "error",
          });
          requestCanInfo();
          reject(new Error("Arm connection failed"));
        }
      });
    });
  }, [servercanState.armId, clearCanWarning, enqueueSnackbar, requestCanInfo]);

  const disconnectArm = useCallback(() => {
    return new Promise((resolve, reject) => {
      setservercanState((prev) => ({
        ...prev,
        armState: "connecting",
      }));
      clearCanWarning("arm");
      console.log("Disconnecting Arm");
      robotsocket.emit("disconnectArm", (response) => {
        console.log("RESPONSE:" + response);
        if (response === "OK") {
          setservercanState((prev) => ({
            ...prev,
            armState: "idle",
          }));
          resolve();
        } else {
          enqueueSnackbar("Arm didn't disconnect. Refreshing...", {
            variant: "error",
          });
          requestCanInfo();
          reject(new Error("Arm disconnection failed"));
        }
      });
    });
  }, [clearCanWarning, enqueueSnackbar, requestCanInfo]);

  function connectScience() {
    setservercanState((prev) => ({
      ...prev,
      scienceState: "connecting",
    }));
    console.log("Connecting Science, Sending id " + servercanState.scienceId);
    robotsocket.emit("connectScience", servercanState.scienceId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setservercanState((prev) => ({
          ...prev,
          scienceState: "active",
        }));
      } else {
        enqueueSnackbar("Science didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectScience() {
    setservercanState((prev) => ({
      ...prev,
      scienceState: "connecting",
    }));
    console.log("Disconnecting Science");
    robotsocket.emit("disconnectScience", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setservercanState((prev) => ({
          ...prev,
          scienceState: "idle",
        }));
      } else {
        enqueueSnackbar("Science didn't disconnect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }

  function connectGPS() {
    setservercanState((prev) => ({
      ...prev,
      gpsState: "connecting",
    }));
    console.log("Connecting GPS, Sending id " + servercanState.gpsId);
    robotsocket.emit("connectGPS", servercanState.gpsId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setservercanState((prev) => ({
          ...prev,
          gpsState: "active",
        }));
      } else {
        enqueueSnackbar("GPS didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectGPS() {
    setservercanState((prev) => ({
      ...prev,
      gpsState: "connecting",
    }));
    console.log("Disconnecting GPS");
    robotsocket.emit("disconnectGPS", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setservercanState((prev) => ({
          ...prev,
          gpsState: "idle",
        }));
      } else {
        enqueueSnackbar(
          "GPS didn't disconnect, auto-updating to current state",
          { variant: "error" },
        );
        requestCanInfo();
      }
    });
  }
  function disconnectAll() {
    if (servercanState.driveState != "idle") {
      disconnectDrive();
    }
    if (servercanState.armState != "idle") {
      disconnectArm();
    }
    if (servercanState.scienceState != "idle") {
      disconnectScience();
    }
    if (servercanState.gpsState != "idle") {
      disconnectGPS();
    }
    console.log("ALL have been disconnected.");
  }

  useEffect(() => {
    const sendCanWarningToast = (canId) => {
      // One persistent warning per CAN target lets recovery close the right one.
      if (canWarningSnackbarIds.current.has(canId)) {
        return;
      }

      const snackbarId = enqueueSnackbar(`Can Overload on ${canId}!`, {
        variant: "error",
        persist: true,
        action: (snackbarId) => (
          <ReconnectAction
            snackbarId={snackbarId}
            disconnectDrive={disconnectDrive}
            connectDrive={connectDrive}
            clearCanWarning={clearCanWarning}
            connectArm={connectArm}
            disconnectArm={disconnectArm}
            canId={canId}
          />
        ),
      });
      canWarningSnackbarIds.current.set(canId, snackbarId);
    };

    robotsocket.on("canoverload", sendCanWarningToast);
    robotsocket.on("canoverloadclear", clearCanWarning);

    return () => {
      robotsocket.off("canoverload", sendCanWarningToast);
      robotsocket.off("canoverloadclear", clearCanWarning);
    };
  }, [
    enqueueSnackbar,
    disconnectDrive,
    connectDrive,
    disconnectArm,
    connectArm,
    clearCanWarning,
  ]);

  const value = {
    servercanState,
    requestCanInfo,
    setservercanState,
    connectDrive,
    disconnectDrive,
    connectArm,
    disconnectArm,
    connectScience,
    disconnectScience,
    connectGPS,
    disconnectGPS,
    disconnectAll,
  };

  return (
    <PeripheralContext.Provider value={value}>
      {children}
    </PeripheralContext.Provider>
  );
};
export default PeripheralProvider;
