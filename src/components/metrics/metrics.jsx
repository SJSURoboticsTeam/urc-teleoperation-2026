import { basesocket, robotsocket } from "../socket.io/socket";
import { useState, useEffect } from "react";
import Typography from "@mui/material/Typography";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import { useRobotSocketStatus, useBaseSocketStatus } from "../socket.io/socket";
import { Box } from "@mui/system";

export function useAntennaData(){
  const [antenna, setantennadata] = useState({
    status: "NO DATA YET",
    roverRSSI: null,
    txrate: null,
    rxrate: null,
    noise: null,
    efficiency : null,
    freq: null,
    freqw: null,
  });

  useEffect(() => {
    const handler = (data) => {
      // console.log("antenna data:", data);
      setantennadata({
        status: data.status,
        roverRSSI: data.dbm,
        txrate: data.txrate,
        rxrate: data.rxrate,
        noise: data.noise,
        efficiency : data.efficiency,
        freq: data.freq,
        freqw: data.freqwidth,
      });
    };

    basesocket.on("antennastats900", handler);

    return () => {
      basesocket.off("antennastats900", handler); // cleanup so no duplicate listeners
    };
  }, []);

  return antenna;
}

export default function Metrics({ openPane, setOpenPane }) {
  const isRobotConnected = useRobotSocketStatus();
  const isBaseConnected = useBaseSocketStatus();
  // antenna telemtry

  const antenna = useAntennaData();

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
            borderRadius: "4px",
          }}
        >
          {isRobotConnected || isBaseConnected ? (
            <div>
              <Typography sx={{ color: "black" }} variant="h6">
                ROVER ANTENNA
              </Typography>

              {antenna.status === "GOOD" ? (
                <div>
                  <Typography sx={{ color: "black" }}>
                    Strength: {antenna.roverRSSI} dBm
                  </Typography>
                  <Typography sx={{ color: "black" }}>
                    Noise: {antenna.noise} dBm
                  </Typography>
                  <Typography sx={{ color: "black" }}>
                    Efficiency: {antenna.efficiency}%
                  </Typography>
                  <Typography sx={{ color: "black" }}>
                    TX & RX: {antenna.txrate}, {antenna.rxrate} Mbps
                  </Typography>
                  <hr className="border-t border-gray-300 my-2 w-1/2 mx-auto" />
                  <Typography sx={{ color: "black" }}>
                    Frequency: {antenna.freq} MHz
                  </Typography>
                  <Typography sx={{ color: "black" }}>
                    Frequency Width: {antenna.freqw} MHz
                  </Typography>
                  
                </div>
              ) : (
                <Typography sx={{ color: "black" }}>
                  {antenna.status}{" "}
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

              <hr className="border-t border-gray-300 my-4" />
              <Typography sx={{ color: "black" }} variant="h6">
                ROBOT
              </Typography>
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
