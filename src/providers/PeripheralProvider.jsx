import { useState, useEffect, useCallback, useRef } from "react";
import { useSnackbar } from "notistack";
import { robotsocket, basesocket } from "../components/socket.io/socket";
import { PeripheralContext } from "../contexts/PeripheralContext";
import Button from "@mui/material/Button";

function ReconnectAction({
  snackbarId,
  disconnectRoverPeripheral, 
  connectRoverPeripheral,
  clearCanWarning,
  canId,
}) {
  const [loading, setLoading] = useState(false);

  const handleReconnect = async () => {
    setLoading(true);

    try {
      disconnectRoverPeripheral(canId);
      connectRoverPeripheral(canId);
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
    drive: {
      id: "disconnect", // selected can id in dropdown or disconnect
      state: "idle", // idle, connecting, active
    },
    arm: {
      id: "disconnect", // selected can id in dropdown or disconnect
      state: "idle", // idle, connecting, active
    },
    science: {
      id: "disconnect", // selected can id in dropdown or disconnect
      state: "idle", // idle, connecting, active
    },
    gps: {
      id: "disconnect", // selected can id in dropdown or disconnect
      state: "idle", // idle, connecting, active
    },
    canIds: [], // array with every possible serial device
    uartMode: "CAN/UART", // CAN/UART (??? state), CAN, UART
    loading: true, // lock buttons, dropdowns when refreshing can data
  });

  const [basecanState, setbasecanState] = useState({
    antennaState: "idle", // idle, connecting, active
    antennaId: "disconnect", // selected can id in dropdown or disconnect
    gpsState: "idle", // idle, connecting, active
    gpsId: "disconnect", // selected can id in dropdown or disconnect
    loading: true, // lock buttons, dropdowns when refreshing can data
    canIds: [], // array with every possible serial device
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
    setbasecanState((prev) => ({
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
    basesocket.emit("getCanInfo", (data) => {
      //console.log(data);
      setbasecanState((prev) => ({
        ...prev,
        canIds: data["canIds"],
        antennaId: data["antennaId"],
        gpsId: data["gpsId"],
        // assignment if connected or not by text
        antennaState: data["antennaId"] !== "disconnect" ? "active" : "idle",
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

  const connectRoverPeripheral = useCallback(
    (id) => {
      setservercanState((current) => ({
        ...current,
        id: {
          ...current.id,
          state: "connecting",
        },
      }));
      clearCanWarning(id);
      return new Promise((resolve, reject) => {
        console.log(
          "Connecting" + id + " , Sending id " + servercanState.drive.id,
        );
        robotsocket.emit(
          "connectPeripheral",
          id,
          servercanState.drive.id,
          (response) => {
            console.log("RESPONSE:" + response);
            if (response === "OK") {
              setservercanState((current) => ({
                ...current,
                id: {
                  ...current.drive,
                  state: "active",
                },
              }));
              resolve();
            } else {
              enqueueSnackbar(id + " didn't connect. Refreshing...", {
                variant: "error",
              });
              requestCanInfo();
              reject(new Error(id + "connection failed"));
            }
          },
        );
      });
    },
    [servercanState, clearCanWarning, enqueueSnackbar, requestCanInfo],
  );

    const disconnectRoverPeripheral = useCallback((id) => {
      setservercanState((current) => ({
        ...current,
        id: {
          ...current.id,
          state: "connecting",
        },
      }));
    clearCanWarning(id);
    return new Promise((resolve, reject) => {
      console.log("Disconnecting drive");
      robotsocket.emit("disconnectDrive", (response) => {
        console.log("RESPONSE:" + response);
        if (response === "OK") {
      setservercanState((current) => ({
        ...current,
        id: {
          ...current.id,
          state: "idle",
        },
      }));
          resolve();
        } else {
          enqueueSnackbar(id + " didn't disconnect. Refreshing...", {
            variant: "error",
          });
          requestCanInfo();
          reject(new Error(id + "disconnection failed"));
        }
      });
    });
  }, [enqueueSnackbar, clearCanWarning, requestCanInfo]);

  
  function disconnectAll() {
    if (servercanState.drive.state != "idle") {
      disconnectRoverPeripheral("drive");
    }
    if (servercanState.arm.state != "idle") {
      disconnectRoverPeripheral("arm");
    }
    if (servercanState.science.state != "idle") {
      disconnectRoverPeripheral("science");
    }
    if (servercanState.gps.state != "idle") {
      disconnectRoverPeripheral("gps");
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
            connectRoverPeripheral={connectRoverPeripheral}
            disconnectRoverPeripheral={disconnectRoverPeripheral}
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
    connectRoverPeripheral, 
    disconnectRoverPeripheral,
    clearCanWarning,
  ]);

  const value = {
    servercanState,
    basecanState,
    requestCanInfo,
    setservercanState,
    setbasecanState,
    connectRoverPeripheral,
    disconnectRoverPeripheral,
    disconnectAll,
  };

  return (
    <PeripheralContext.Provider value={value}>
      {children}
    </PeripheralContext.Provider>
  );
};
export default PeripheralProvider;
