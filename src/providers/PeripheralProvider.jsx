import { useState } from "react";
import { useSnackbar } from "notistack";
import { robotsocket } from "../components/socket.io/socket";
import { PeripheralContext } from "../contexts/PeripheralContext";


export const PeripheralProvider = ({ children }) => {

    const { enqueueSnackbar } = useSnackbar();

  const [canState, setcanState] = useState({
    driveState: "idle", // idle, connecting, active
    armState: "idle", // idle, connecting, active
    scienceState: "idle", // idle, connecting, active
    gpsState: "idle", // idle, connecting, active
    uartMode: "???", // ???, CAN, UART
    loading: true, // lock buttons, dropdowns when refreshing can data
    canIds: [], // array with every possible serial device
    driveId: "disconnect", // selected can id in dropdown or disconnect
    armId: "disconnect", // selected can id in dropdown or disconnect
    scienceId: "disconnect", // selected can id in dropdown or disconnect
    gpsId: "disconnect", // selected can id in dropdown or disconnect
  });

  function requestCanInfo() {
    // lock the ui so user can't do anything while loading
    setcanState((prev) => ({
      ...prev,
      loading: true,
    }));
    robotsocket.emit("getCanInfo", (data) => {
      //console.log(data);
      setcanState((prev) => ({
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
  }

  function connectDrive() {
    setcanState((prev) => ({
      ...prev,
      driveState: "connecting",
    }));
    console.log("Connecting Drive, Sending id " + canState.driveId);
    robotsocket.emit("connectDrive", canState.driveId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          driveState: "active",
        }));
      } else {
        enqueueSnackbar("Drive didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectDrive() {
    setcanState((prev) => ({
      ...prev,
      driveState: "connecting",
    }));
    console.log("Disconnecting drive");
    robotsocket.emit("disconnectDrive", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          driveState: "idle",
        }));
      } else {
        enqueueSnackbar("Drive didn't disconnect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }

  function connectArm() {
    setcanState((prev) => ({
      ...prev,
      armState: "connecting",
    }));
    console.log("Connecting Arm, Sending id " + canState.armId);
    robotsocket.emit("connectArm", canState.armId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          armState: "active",
        }));
      } else {
        enqueueSnackbar("Arm didn't connect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }
  function disconnectArm() {
    setcanState((prev) => ({
      ...prev,
      armState: "connecting",
    }));
    console.log("Disconnecting Arm");
    robotsocket.emit("disconnectArm", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
          ...prev,
          armState: "idle",
        }));
      } else {
        enqueueSnackbar("Arm didn't disconnect. Refreshing...", {
          variant: "error",
        });
        requestCanInfo();
      }
    });
  }

  function connectScience() {
    setcanState((prev) => ({
      ...prev,
      scienceState: "connecting",
    }));
    console.log("Connecting Science, Sending id " + canState.scienceId);
    robotsocket.emit("connectScience", canState.scienceId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
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
    setcanState((prev) => ({
      ...prev,
      scienceState: "connecting",
    }));
    console.log("Disconnecting Science");
    robotsocket.emit("disconnectScience", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
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
    setcanState((prev) => ({
      ...prev,
      gpsState: "connecting",
    }));
    console.log("Connecting GPS, Sending id " + canState.gpsId);
    robotsocket.emit("connectGPS", canState.gpsId, (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
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
    setcanState((prev) => ({
      ...prev,
      gpsState: "connecting",
    }));
    console.log("Disconnecting GPS");
    robotsocket.emit("disconnectGPS", (response) => {
      console.log("RESPONSE:" + response);
      if (response === "OK") {
        setcanState((prev) => ({
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
    if (canState.driveState != "idle") {
      disconnectDrive();
    }
    if (canState.armState != "idle") {
      disconnectArm();
    }
    if (canState.scienceState != "idle") {
      disconnectScience();
    }
    if (canState.gpsState != "idle") {
      disconnectGPS();
    }
    console.log("ALL have been disconnected.");
  }

    const value = {
      canState,
      requestCanInfo,
      setcanState,
      connectDrive,
      disconnectDrive,
      connectArm, 
      disconnectArm, 
      connectScience, 
      disconnectScience,
      connectGPS, 
      disconnectGPS, 
      disconnectAll
    };

  return (
    <PeripheralContext.Provider value={value}>
      {children}
    </PeripheralContext.Provider>
  );
}
export default PeripheralProvider;