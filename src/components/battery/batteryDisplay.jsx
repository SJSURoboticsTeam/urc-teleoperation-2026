import { robotsocket } from "../socket.io/socket";
import { useEffect, useState, useRef } from "react";
import { Box, Tooltip, Typography } from "@mui/material";

const TIMEOUT_SEC = 30;

export default function BatteryDisplay() {
	const [batteryPercentage, setBatteryPercentage] = useState(null);
	const timeoutReference = useRef(null);

	useEffect(() => {
		const handleBatteryData = (percentage) => {
			setBatteryPercentage(percentage);

			clearTimeout(timeoutReference.current);
			timeoutReference.current = setTimeout(() => {
				setBatteryPercentage(null);	
			}, TIMEOUT_SEC * 1000);
		}
		const handleDisconnection = () => setBatteryPercentage(null);

		robotsocket.on("batteryPercentage", handleBatteryData);
		robotsocket.on("disconnect", handleDisconnection);

		return () => {
			robotsocket.off("batteryPercentage", handleBatteryData);
			robotsocket.off("disconnect", handleDisconnection);
		}
	}, []);

	const hasData = batteryPercentage !== null;
	const isLow = hasData && batteryPercentage < 20;
	const toolTipTitle = hasData ? "" : "No data";

	return (
		<Tooltip title={toolTipTitle} arrow>
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
							width: `${hasData ? batteryPercentage : 0}%`,
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
		</Tooltip>
	);
}