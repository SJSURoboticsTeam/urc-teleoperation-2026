import { useState, useEffect, useCallback, useRef } from "react";
import { useSnackbar } from "notistack";
import { robotsocket, basesocket } from "../components/socket.io/socket";
import { PeripheralContext } from "../contexts/PeripheralContext";
import Button from "@mui/material/Button";
import { useSerial } from "../contexts/SerialContext";


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

  const { serialState } = useSerial();

    // true if canId is already taken by another rover line or the serial port
  const isDuplicateRover = (line, canId) =>
    ["drive", "arm", "science", "gps"].some(
      (other) => other !== line && servercanState[other].id === canId,
    ) || canId === serialState.portId;


  const [basecanState, setbasecanState] = useState({
    antenna: {
      id: "disconnect", // selected can id in dropdown or disconnect
      state: "idle", // idle, connecting, active
    },
    gps: {
      id: "disconnect", // selected can id in dropdown or disconnect
      state: "idle", // idle, connecting, active
    },
    loading: true, // lock buttons, dropdowns when refreshing can data
    canIds: [], // array with every possible serial device
  });

  const canWarningSnackbarIds = useRef(new Map());
  const previousCanIds = useRef({
    drive: servercanState.drive.id,
    arm: servercanState.arm.id,
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
      drive: servercanState.drive.id,
      arm: servercanState.arm.id,
    };

    // Centralize warning cleanup so every source of a CAN ID change is covered.
    for (const canId of ["drive", "arm"]) {
      if (previousCanIds.current[canId] !== currentCanIds[canId]) {
        clearCanWarning(canId);
      }
    }
    previousCanIds.current = currentCanIds;
  }, [servercanState.arm.id, servercanState.drive.id, clearCanWarning]);

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
        drive: {
          state: data["driveId"] !== "disconnect" ? "active" : "idle",
          id: data["driveId"],
        },
        arm: {
          state: data["armId"] !== "disconnect" ? "active" : "idle",
          id: data["armId"],
        },
        science: {
          state: data["scienceId"] !== "disconnect" ? "active" : "idle",
          id: data["scienceId"],
        },
        gps: {
          state: data["gpsId"] !== "disconnect" ? "active" : "idle",
          id: data["gpsId"],
        },
        uartMode: data["uartMode"],
        loading: false,
        canIds: data["canIds"],
      }));
    });
    basesocket.emit("getCanInfo", (data) => {
      //console.log(data);
      setbasecanState((prev) => ({
        ...prev,
        antenna: {
          state: data["antennaId"] !== "disconnect" ? "active" : "idle",
          id: data["antennaId"],
        },
        gps: {
          state: data["gpsId"] !== "disconnect" ? "active" : "idle",
          id: data["gpsId"],
        },
        loading: false,
        canIds: data["canIds"],
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
        [id]: {
          ...current[id],
          state: "connecting",
        },
      }));
      clearCanWarning(id);
      return new Promise((resolve, reject) => {
        console.log(
          "Connecting" + id + " , Sending id " + servercanState.drive.id,
        );
        robotsocket.emit(
          "connectRoverPeripheral",
          id,
          servercanState[id].id,
          (response) => {
            console.log("RESPONSE:" + response);
            if (response === "OK") {
              setservercanState((current) => ({
                ...current,
                [id]: {
                  ...current[id],
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

  const disconnectRoverPeripheral = useCallback(
    (id) => {
      setservercanState((current) => ({
        ...current,
        [id]: {
          ...current[id],
          state: "connecting",
        },
      }));
      clearCanWarning(id);
      return new Promise((resolve, reject) => {
        console.log("Disconnecting drive");
        robotsocket.emit("disconnectRoverPeripheral", id, (response) => {
          console.log("RESPONSE:" + response);
          if (response === "OK") {
            setservercanState((current) => ({
              ...current,
              [id]: {
                ...current[id],
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
    },
    [enqueueSnackbar, clearCanWarning, requestCanInfo],
  );

  const connectBasePeripheral = useCallback(
    (id) => {
      setbasecanState((current) => ({
        ...current,
        [id]: { ...current[id], state: "connecting" },
      }));

      return new Promise((resolve, reject) => {
        basesocket.emit(
          "connectBasePeripheral",
          id,
          basecanState[id].id,
          (response) => {
            if (response === "OK") {
              setbasecanState((current) => ({
                ...current,
                [id]: { ...current[id], state: "active" },
              }));
              resolve();
            } else {
              enqueueSnackbar(id + " didn't connect. Refreshing...", {
                variant: "error",
              });
              requestCanInfo();
              reject(new Error(id + " connection failed"));
            }
          },
        );
      });
    },
    [basecanState, enqueueSnackbar, requestCanInfo],
  );

  const disconnectBasePeripheral = useCallback(
    (id) => {
      setbasecanState((current) => ({
        ...current,
        [id]: { ...current[id], state: "connecting" },
      }));

      return new Promise((resolve, reject) => {
        basesocket.emit("disconnectBasePeripheral", id, (response) => {
          if (response === "OK") {
            setbasecanState((current) => ({
              ...current,
              [id]: { ...current[id], state: "idle" },
            }));
            resolve();
          } else {
            enqueueSnackbar(id + " didn't disconnect. Refreshing...", {
              variant: "error",
            });
            requestCanInfo();
            reject(new Error(id + " disconnection failed"));
          }
        });
      });
    },
    [enqueueSnackbar, requestCanInfo],
  );

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
    connectBasePeripheral,
    disconnectBasePeripheral,
    disconnectAll,
    isDuplicateRover
  };

  return (
    <PeripheralContext.Provider value={value}>
      {children}
    </PeripheralContext.Provider>
  );
};
export default PeripheralProvider;
