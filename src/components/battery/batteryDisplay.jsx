import { robotsocket } from "../socket.io/socket";
import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

const MAX_BATTERY_VOLTAGE = 40;
const MIN_BATTERY_VOLTAGE = 36;

export default function BatteryDisplay() {
    const [batteryPercentage, setBatteryPercentage] = useState(null);

    useEffect(() => {
        const handler = (voltage) => {
            let percentage = ((voltage - MIN_BATTERY_VOLTAGE) / (MAX_BATTERY_VOLTAGE - MIN_BATTERY_VOLTAGE)) * 100;
            setBatteryPercentage(Math.max(0, Math.min(100, percentage)));
        }
        const handleDisconnection = () => {
            setBatteryPercentage(null);
        };

        robotsocket.on("batteryVoltage", handler);
        robotsocket.on("disconnect", handleDisconnection);
        return () => {
            robotsocket.off("batteryVoltage", handler);
            robotsocket.off("disconnect", handleDisconnection);
        }
    }, []);

    const hasData = batteryPercentage !== null;
    const isLow = hasData && batteryPercentage < 20;

    return (
         <Box sx={{ display: "flex", alignItems: "center" }}>
            {/* battery body */}
            <Box
                sx={{
                    position: "relative",
                    isolation: 'isolate',
                    width: 34,
                    height: 18,
                    borderRadius: "5px",
                    overflow: "hidden",
                    bgcolor: "action.disabledBackground",
                }}
            >
                {/* fill */}
                <Box
                    sx={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${batteryPercentage}%`,
                        bgcolor: isLow ? "red" : "white",
                        transition: "width 0.4s ease",
                    }}
                />
                {/* number */}
                <Typography
                    component="span"
                    sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: "white",
                        mixBlendMode: isLow ? "normal" : "difference",
                    }}
                >
                    {hasData ? Math.round(batteryPercentage) : "?"}
                </Typography>
            </Box>
            {/* terminal nub */}
            <Box
                sx={{
                    width: 2,
                    height: 6,
                    ml: "1px",
                    bgcolor: "action.disabled",
                    borderRadius: "0 2px 2px 0",
                }}
            />
        </Box>
    );
}