import { Typography, Box } from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { useEffect, useMemo, useState } from 'react';
import { socket } from '../socket.io/socket';
import { useSocketStatus } from '../socket.io/socket';
import { onClientCommandSent } from '../socket.io/socket';
import { green, red } from '@mui/material/colors';

// Constants for health level thresholds
const GOOD_MS = 4000;
const WARN_MS = 9000;

export default function HealthIndicator({ openPane, setOpenPane, demoMode = false, mockPeriodMs = 2000 }) {
    // check if socket is connected
    const isConnected = useSocketStatus();

    // state for last command sent and response received
    const [lastCommandSentAt, setLastCommandSentAt] = useState(null);
    const [lastResponseReceivedAt, setLastResponseReceivedAt] = useState(null);

    // tick is used to force re-calculation of health level every second, even if no new commands or responses come in
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // MOCK TELEMETRY: updates "response received" every MOCK_PERIOD_MS ms
    useEffect(() => {
        // if not connected, clear last response received
        if (!isConnected) {
            setLastResponseReceivedAt(null);
            return;
        }

        // DEMO MODE: synthetic "telemetry"
        if (demoMode) {
            setLastResponseReceivedAt(Date.now());
            const id = setInterval(() => setLastResponseReceivedAt(Date.now()), mockPeriodMs);
            // cleanup interval on disconnect or when demo mode is turned off
            return() => clearInterval(id);
        }

        // REAL MODE: listen to actual telemetry events
        const markResponse = () => setLastResponseReceivedAt(Date.now());
        socket.on("cpustats", markResponse);
        socket.on("antennastats", markResponse);
        // add more telemetry events as needed, e.g. "driveStatus", "armStatus", etc.

        return () => {
            socket.off("cpustats", markResponse);
            socket.off("antennastats", markResponse);
            // clean up any additional events here as well
        };
    }, [isConnected, demoMode,mockPeriodMs]);

    // listen for client commands
    useEffect(() => {
        const off = onClientCommandSent((info) => {
            setLastCommandSentAt(Date.now());
        });
        // clean up on disconnect
        return off;
    }, []);

    // calculate health level based on last response received
    const level = useMemo(() => {
        if (!isConnected) return "LOST";
        if (!lastResponseReceivedAt) return "NO DATA"; // DEFAULT

        // calculate age in milliseconds
        const age = Date.now() - lastResponseReceivedAt;
        if (age <= GOOD_MS) return "GOOD";
        if (age <= WARN_MS) return "WARN";
        return "LOST";
    }, [isConnected, lastResponseReceivedAt, tick]);

    // styles that depend on health level
    const pillStyle = 
        level === "GOOD"
            ? {backgroundColor: "#d9f2de", color: "#1b5e20" }
            : level === "WARN"
            ? {backgroundColor: "#f5e6b3", color: "#8a5b00" }
            : level === "LOST"
            ? {backgroundColor: "#f7d7d7", color: "#8b1a1a" }
            : {backgroundColor: "#e5e7eb", color: "#374151" }; // NO DATA

    // icon color also changes with level
    const iconColor = 
        level === "GOOD"
            ? green[500]
            : level === "WARN"
            ? "#f1b400"
            : level === "LOST"
            ? red[500]
            : "gray" // NO DATA

    // calculate how long ago the last command and response were, for display in the details pane
    const lastCmdAgo = lastCommandSentAt
        ? `${Math.round((Date.now() - lastCommandSentAt) / 1000)}s ago`
        : "-"; // if no command sent yet, show "-"
    const lastRespAgo = lastResponseReceivedAt
        ? `${Math.round((Date.now() - lastResponseReceivedAt) / 1000)}s ago`
        : "-"; // if no response received yet, show "-"

    // message to display based on health level
    const message = 
        level === "GOOD"
            ? "Communication is healthy"
            : level === "WARN"
            ? "Reduced performance detected"
            : level === "LOST"
            ? "Communication lost"
            : "Checking communication..."; // NO DATA

    return (
        <div
            // show details pane on hover, with info about last command/response timing and a message about what the health level means
            onMouseEnter={() => setOpenPane("HealthIndicator")}
            onMouseLeave={() => setOpenPane("None")}
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
            {/*  icon/text changes with level */}
            HEALTH<MonitorHeartIcon sx={{ fontSize: 35, color: iconColor }} />
          </span>

          {/* details pane on hover */}
          {openPane === "HealthIndicator" && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "40%",
                transform: "translateX(-50%)",
                background: "white",
                border: "1px solid #ddd",
                padding: "12px",
                minWidth:"240px",
                borderRadius: "8px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
              }}
            >
                {/* health level pill */}
                <Box
                    sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        display: "inline-block",
                        fontWeight: 700,
                        mb: 1,
                        ...pillStyle,
                    }}
                >
                    {level}
                </Box>

                {/* message about health level */}
                <Typography variant="body2" sx={{ color: "text.secondary", mb:1 }}>
                    {message}
                </Typography>

                {/* divider */}
                <hr className="border-gray-300" />

                {/* Details */}
                <div style={{ color: "black", textAlign: "left", marginTop: 10 }}>
                    <Typography variant="body2">
                        Last Command Sent: <b>{lastCmdAgo}</b>
                    </Typography>
                    <Typography variant="body2">
                        Last Response Received: <b>{lastRespAgo}</b>
                    </Typography>
                </div>
            </div>
          )}
        </div>
    );
}
