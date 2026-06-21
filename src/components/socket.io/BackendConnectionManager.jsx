import { basesocket, robotsocket } from "./socket";
import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { green, red, yellow } from "@mui/material/colors";
import { useRobotSocketStatus, useBaseSocketStatus } from "./socket";
import MapsHomeWorkIcon from "@mui/icons-material/MapsHomeWork";
import SettingsRemoteIcon from "@mui/icons-material/SettingsRemote";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import EjectIcon from "@mui/icons-material/Eject";
import Paper from "@mui/material/Paper";
import PeripheralManager from "./PeripheralManager";
import ShutdownManager from "./ShutdownManager";

export default function NavConnectionStatus({ openPane, setOpenPane }) {
  const isRobotConnected = useRobotSocketStatus(); // get socket status from ui
  const isBaseConnected = useBaseSocketStatus(); // get socket status from ui

  // robot
  const [robotLatency, setRobotLatency] = useState(null); // integer of rough estimated latency based on roundtrip ping
  const [robotNumConnections, setRobotNumConnections] = useState(0); // integer with clients that polls from backend
  const [robotConnType, setRobotConnType] = useState("???"); // awaiting data ("checking"), websockets ("Yes"), polling ("No")
  // base
  const [baseLatency, setBaseLatency] = useState(null); // integer of rough estimated latency based on roundtrip ping
  const [baseNumConnections, setBaseNumConnections] = useState(0); // integer with clients that polls from backend
  const [baseConnType, setBaseConnType] = useState("???"); // awaiting data ("checking"), websockets ("Yes"), polling ("No")

  const LATENCY_DEGRADED_THRESHOLD = 300;
  const LATENCY_DANGER_THRESHOLD = 1000;

  // Determine communication health based on connection status and latency
  const getHealthState = ({ isRobotConnected, robotLatency }) => {
    if (!isRobotConnected) return "DANGER";

    // latency may be null when the UI first loads
    if (robotLatency !== null && robotLatency > LATENCY_DANGER_THRESHOLD)
      return "DANGER";
    if (robotLatency !== null && robotLatency > LATENCY_DEGRADED_THRESHOLD)
      return "DEGRADED";

    return "GOOD";
  };

  const healthConfig = {
    GOOD: {
      color: green[500],
      message: "System communication stable",
    },
    DEGRADED: {
      color: yellow[500],
      message: "High latency detected",
    },
    DANGER: {
      color: red[500],
      message: "Critical latency detected",
    },
  };

  // determine the state
  const healthLevel = getHealthState({ isRobotConnected, robotLatency });
  // get the UI config
  const health = healthConfig[healthLevel];

  // server connect, disconnect
  function connectBasePi() {
    basesocket.connect();
  }

  function disconnectBasePI() {
    basesocket.disconnect();
  }

  function connectRobotPi() {
    robotsocket.connect();
  }

  function disconnectRobotPI() {
    robotsocket.disconnect();
  }
  const [robotconnectedIcon, setrobotConnectedIcon] = useState("");

  //icons and if connected
  useEffect(() => {
    setrobotConnectedIcon(
      isRobotConnected ? (
        <SettingsRemoteIcon sx={{ color: green[500], fontSize: 35 }} />
      ) : (
        <SettingsRemoteIcon sx={{ color: red[500], fontSize: 35 }} />
      ),
    );
  }, [isRobotConnected]);

  const [baseconnectedIcon, setbaseConnectedIcon] = useState("");

  useEffect(() => {
    setbaseConnectedIcon(
      isBaseConnected ? (
        <MapsHomeWorkIcon sx={{ color: green[500], fontSize: 35 }} />
      ) : (
        <MapsHomeWorkIcon sx={{ color: red[500], fontSize: 35 }} />
      ),
    );
  }, [isBaseConnected]);

  // polling effects

  // ROBOT

  useEffect(() => {
    let interval;
    // send a ping to the server every 750ms and measure latency
    function checkLatency() {
      const start = Date.now();
      robotsocket.emit("pingCheck", () => {
        setRobotLatency(Date.now() - start);
      });
    }

    interval = setInterval(checkLatency, 750);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    // send a ping to the server every 2s to get number of connected clients from backend
    function numClients() {
      robotsocket.emit("getConnections", (connections) => {
        setRobotNumConnections(connections);
      });
    }

    interval = setInterval(numClients, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    // see if client is connected optimally (websockets) or not
    function getConnType() {
      const robottransport = robotsocket?.io?.engine?.transport?.name;
      if (robottransport == "websocket") {
        setRobotConnType("Yes");
      } else {
        setRobotConnType("No");
      }
    }
    interval = setInterval(getConnType, 2000);
    return () => clearInterval(interval);
  }, []);

  // BASE

  useEffect(() => {
    let interval;
    // send a ping to the server every 750ms and measure latency
    function checkLatency() {
      const start = Date.now();
      basesocket.emit("pingCheck", () => {
        setBaseLatency(Date.now() - start);
      });
    }
    interval = setInterval(checkLatency, 750);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    // send a ping to the server every 2s to get number of connected clients from backend
    function numClients() {
      basesocket.emit("getConnections", (connections) => {
        setBaseNumConnections(connections);
      });
    }

    interval = setInterval(numClients, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval;
    // see if client is connected optimally (websockets) or not
    function getConnType() {
      const basetransport = basesocket?.io?.engine?.transport?.name;
      if (basetransport == "websocket") {
        setBaseConnType("Yes");
      } else {
        setBaseConnType("No");
      }
    }
    interval = setInterval(getConnType, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      onMouseEnter={() => setOpenPane("Backend")}
      onMouseLeave={() => setOpenPane("None")}
      // needed to detect hover and placement of popup
      style={{ position: "relative", cursor: "pointer", textAlign: "center" }}
    >
      <span
        style={{
          whiteSpace: "pre-wrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginRight: 20,
        }}
      >
        SERVER{robotconnectedIcon}
        {baseconnectedIcon}
      </span>

      {openPane == "Backend" && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            border: "1px solid gray",
            padding: "10px",
            width: "300px",
            borderRadius: "12px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "center",
            }}
          >
            <Box>
              <Typography
                sx={{ color: "black", mt: -1 }}
                variant="h6"
                fontWeight={600}
              >
                ROBOT PI
              </Typography>
              <Button
                color="success"
                onClick={connectRobotPi}
                variant="contained"
                sx={{ width: 120 }}
              >
                CONNECT
              </Button>
              <Button
                color="error"
                onClick={disconnectRobotPI}
                variant="contained"
                sx={{ width: 120, mt: 1 }}
              >
                DISCONNECT
              </Button>
            </Box>
            <hr className="border-t border-gray-300 my-4" />
            <Box>
              <Typography
                sx={{ color: "black", mt: -1 }}
                variant="h6"
                fontWeight={600}
              >
                BASE PI
              </Typography>
              <Button
                color="success"
                onClick={connectBasePi}
                variant="contained"
                sx={{ width: 120 }}
              >
                CONNECT
              </Button>
              <Button
                color="error"
                onClick={disconnectBasePI}
                variant="contained"
                sx={{ width: 120, mt: 1 }}
              >
                DISCONNECT
              </Button>
            </Box>
          </Box>
          <hr className="border-t border-gray-300 my-4" />
          {isBaseConnected || isRobotConnected ? (
            <div>
              <div style={{ textAlign: "center", padding: "4px 0" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: health.color,
                    }}
                  />
                  <Typography sx={{ color: "black", fontWeight: 600 }}>
                    HEALTH: {healthLevel}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  {health.message}
                </Typography>
              </div>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr",
                  gap: 0.5,
                  backgroundColor: "#ebebeb",
                  p: 1,
                  borderRadius: 2,
                  mt: 1,
                }}
              >
                {/* Headers */}
                <Typography sx={{ color: "black" }} fontWeight={600}>
                  Data Field
                </Typography>
                <Typography sx={{ color: "black" }} fontWeight={600}>
                  Robot PI
                </Typography>
                <Typography sx={{ color: "black" }} fontWeight={600}>
                  Base PI
                </Typography>

                {/* Latency Row */}
                <Typography sx={{ color: "black" }}>Latency:</Typography>
                <Typography sx={{ color: "black" }}>
                  {robotLatency} ms
                </Typography>
                <Typography sx={{ color: "black" }}>
                  {baseLatency} ms
                </Typography>

                {/* Clients Row */}
                <Typography sx={{ color: "black" }}># of Clients:</Typography>
                <Typography sx={{ color: "black" }}>
                  {robotNumConnections}
                </Typography>
                <Typography sx={{ color: "black" }}>
                  {baseNumConnections}
                </Typography>
                {/* Websockets Row */}
                <Typography sx={{ color: "black" }}>Websockets</Typography>
                <Typography sx={{ color: "black" }}>{robotConnType}</Typography>
                <Typography sx={{ color: "black" }}>{baseConnType}</Typography>
              </Box>
              <hr className="border-t border-gray-300 my-4" />
            </div>
          ) : null}

          {isRobotConnected ? (
            <div>
              <PeripheralManager openPane={openPane} />
              <hr className="border-t border-gray-300 my-4" />
            </div>
          ) : (
            <Typography sx={{ color: "black" }}>Robot is offline.</Typography>
          )}
          <ShutdownManager />
        </div>
      )}
    </div>
  );
}
