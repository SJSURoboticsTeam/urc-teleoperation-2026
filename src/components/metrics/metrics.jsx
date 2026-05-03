import { basesocket, robotsocket } from "../socket.io/socket";
import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import { useRobotSocketStatus, useBaseSocketStatus } from "../socket.io/socket";
import { Box } from "@mui/system";

export function useAntennaData() {
  const [antenna900, setantennadata900] = useState({
    status: "NO DATA YET",
    roverRSSI: null,
    txrate: null,
    rxrate: null,
    noise: null,
    efficiency: null,
    freq: null,
    freqw: null,
  });
  const [antenna5, setantennadata5] = useState({
    status: "NO DATA YET",
    roverRSSI: null,
    txrate: null,
    rxrate: null,
    noise: null,
    efficiency: null,
    freq: null,
    freqw: null,
  });

  useEffect(() => {
    const handler900 = (data) => {
      // console.log("antenna data:", data);
      setantennadata900({
        status: data.status,
        roverRSSI: data.dbm,
        txrate: data.txrate,
        rxrate: data.rxrate,
        noise: data.noise,
        efficiency: data.efficiency,
        freq: data.freq,
        freqw: data.freqwidth,
      });
    };

    const handler5 = (data) => {
      // console.log("antenna data:", data);
      setantennadata5({
        status: data.status,
        roverRSSI: data.dbm,
        txrate: data.txrate,
        rxrate: data.rxrate,
        noise: data.noise,
        efficiency: data.efficiency,
        freq: data.freq,
        freqw: data.freqwidth,
      });
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

export default function Metrics({ openPane, setOpenPane }) {
  const isRobotConnected = useRobotSocketStatus();
  const isBaseConnected = useBaseSocketStatus();
  // antenna telemtry

  const [antenna900, antenna5] = useAntennaData();

  const [robotRPIData, setRobotRPIData] = useState({
    status: "NO DATA YET",
    cpupercent: null,
    rampercent: null,
    cputemp: null,
  });
  const [baseRPIData, setBaseRPIData] = useState({
    status: "NO DATA YET",
    cpupercent: null,
    rampercent: null,
    cputemp: null,
  });

  // robot
  useEffect(() => {
    const handler = (data) => {
      //console.log("cpu data:", data);
      setRobotRPIData({
        status: data.status,
        cpupercent: data.cpupercent,
        rampercent: data.rampercent,
        cputemp: data.cputemp,
      });
    };

    robotsocket.on("cpustats", handler);

    return () => {
      robotsocket.off("cpustats", handler); // cleanup so no duplicate listeners
    };
  }, []);
  // base pi
  useEffect(() => {
    const handler = (data) => {
      //console.log("cpu data:", data);
      setBaseRPIData({
        status: data.status,
        cpupercent: data.cpupercent,
        rampercent: data.rampercent,
        cputemp: data.cputemp,
      });
    };

    basesocket.on("cpustats", handler);

    return () => {
      basesocket.off("cpustats", handler); // cleanup so no duplicate listeners
    };
  }, []);

  return (
    <div
      onMouseEnter={() => setOpenPane("Metrics")}
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
          marginRight: 10,
        }}
      >
        METRICS
        <AnalyticsIcon sx={{ fontSize: 35 }} />
      </span>

      {openPane == "Metrics" && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            border: "1px solid gray",
            padding: "10px",
            minWidth: "300px",
            borderRadius: "12px",
          }}
        >
          {isRobotConnected || isBaseConnected ? (
            <div>
              <Typography sx={{ color: "black" }} variant="h6">
                ROVER ANTENNA
              </Typography>

              {antenna900.status === "GOOD" || antenna5.status === "GOOD" ? (
                <div>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 0.5,
                      backgroundColor: "#ebebeb",
                      p: 1,
                      borderRadius: 2,
                      mt: -0.25,
                    }}
                  >
                    {/* Headers */}
                    <Typography sx={{ color: "black" }} fontWeight={600}>
                      Antenna
                    </Typography>
                    <Typography sx={{ color: "black" }} fontWeight={600}>
                      900Mhz
                    </Typography>
                    <Typography sx={{ color: "black" }} fontWeight={600}>
                      5Ghz
                    </Typography>

                    <Typography sx={{ color: "black" }}>Strength</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.roverRSSI} dBm
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.roverRSSI} dBm
                    </Typography>

                    <Typography sx={{ color: "black" }}>Noise</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.noise} dBm
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.noise} dBm
                    </Typography>

                    <Box
                      sx={{
                        gridColumn: "1 / -1",
                        backgroundColor: "gray",
                        borderTop: "1px solid gray",
                        height: 0
                      }}
                    />

                    <Typography sx={{ color: "black" }}>Efficiency</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.efficiency}%
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.efficiency}%
                    </Typography>

                    <Typography sx={{ color: "black" }}>TX</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.txrate}
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.txrate}
                    </Typography>

                    <Typography sx={{ color: "black" }}>RX</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.rxrate}
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.rxrate}
                    </Typography>

                    {/* Divider row */}
                    <Box
                      sx={{
                        gridColumn: "1 / -1",
                        backgroundColor: "gray",
                        borderTop: "1px solid gray",
                        height: 0
                      }}
                    />

                    <Typography sx={{ color: "black" }}>Frequency</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.freq} MHz
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.freq} MHz
                    </Typography>

                    <Typography sx={{ color: "black" }}>Width</Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna900.freqw} MHz
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {antenna5.freqw} MHz
                    </Typography>
                  </Box>
                </div>
              ) : (
                <Typography sx={{ color: "black" }}>
                  {antenna900.status}{" "}
                </Typography>
              )}

              <hr className="border-t border-gray-300 my-4" />
              <Typography sx={{ color: "black" }} variant="h6">
                RPI STATUS
              </Typography>
              {robotRPIData.status === "GOOD" ||
              baseRPIData.status === "GOOD" ? (
                <div>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      gap: 0.5,
                      backgroundColor: "#ebebeb",
                      p: 1,
                      borderRadius: 2,
                      mt: -0.25,
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
                    <Typography sx={{ color: "black" }}>% of CPU:</Typography>
                    <Typography sx={{ color: "black" }}>
                      {robotRPIData.cpupercent}%
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {baseRPIData.cpupercent}%
                    </Typography>

                    {/* Clients Row */}
                    <Typography sx={{ color: "black" }}>% of RAM:</Typography>
                    <Typography sx={{ color: "black" }}>
                      {robotRPIData.rampercent}%
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {baseRPIData.rampercent}%
                    </Typography>
                    {/* Websockets Row */}
                    <Typography sx={{ color: "black" }}>CPU Temp:</Typography>
                    <Typography sx={{ color: "black" }}>
                      {robotRPIData.cputemp}°C
                    </Typography>
                    <Typography sx={{ color: "black" }}>
                      {baseRPIData.cputemp}°C
                    </Typography>
                  </Box>
                </div>
              ) : (
                <Typography sx={{ color: "black" }}>
                  {robotRPIData.status}{" "}
                </Typography>
              )}

              {/* <hr className="border-t border-gray-300 my-4" />
              <Typography sx={{ color: "black" }} variant="h6">
                ROBOT
              </Typography> */}
            </div>
          ) : (
            <Typography sx={{ color: "black" }}>
              You aren't connected to the server! :(
            </Typography>
          )}
        </div>
      )}
    </div>
  );
}
