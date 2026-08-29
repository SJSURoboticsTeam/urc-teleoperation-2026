import { useState } from "react";
import {
  Box,
  Button,
  CssBaseline,
  Dialog,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { green, red } from "@mui/material/colors";
import { useNavigate } from "react-router-dom";
import {
  robotsocket,
  useRobotSocketStatus,
} from "../components/socket.io/socket";

export default function EmergencyView() {
  const navigate = useNavigate();
  const isRobotConnected = useRobotSocketStatus();
  const [estopStatus, setEstopStatus] = useState("STANDBY");

  function initiateEstop() {
    setEstopStatus("LOADING");
    robotsocket.emit("E_STOP", (response) => {
      if (response === "OK") {
        setEstopStatus("KILLED");
      }
    });
  }

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          alignItems: "center",
          bgcolor: "background.default",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(32px, 8dvh, 72px)",
          height: "100dvh",
          justifyContent: "center",
          overflow: "hidden",
          px: "max(24px, env(safe-area-inset-left))",
          py: "max(24px, env(safe-area-inset-top))",
          width: "100%",
        }}
      >
        <IconButton
          aria-label="Back to controls"
          onClick={() => navigate("/drive")}
          sx={{
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            left: "max(16px, env(safe-area-inset-left))",
            position: "absolute",
            top: "max(16px, env(safe-area-inset-top))",
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Box
          role="status"
          sx={{
            alignItems: "center",
            bgcolor: isRobotConnected ? green[50] : red[50],
            border: "2px solid",
            borderColor: isRobotConnected ? green[700] : red[700],
            borderRadius: 999,
            display: "flex",
            gap: 1.25,
            px: 2.5,
            py: 1.25,
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              bgcolor: isRobotConnected ? green[700] : red[700],
              borderRadius: "50%",
              height: 14,
              width: 14,
            }}
          />
          <Typography
            color={isRobotConnected ? green[900] : red[900]}
            fontWeight={700}
            letterSpacing="0.04em"
          >
            ROBOT {isRobotConnected ? "CONNECTED" : "DISCONNECTED"}
          </Typography>
        </Box>

        <Button
          aria-label="Emergency stop"
          color="error"
          disabled={!isRobotConnected}
          loading={estopStatus === "LOADING"}
          onClick={initiateEstop}
          variant="contained"
          sx={{
            aspectRatio: "1 / 1",
            border: "clamp(8px, 2.5vmin, 14px) solid",
            borderColor: red[900],
            borderRadius: "50%",
            boxShadow: `0 12px 0 ${red[900]}, 0 20px 32px rgba(0, 0, 0, 0.35)`,
            flexShrink: 0,
            fontSize: "clamp(2rem, 10vmin, 4rem)",
            fontWeight: 900,
            lineHeight: 1,
            touchAction: "manipulation",
            width: "min(76vw, 58dvh, 380px)",
            "&.Mui-disabled": {
              bgcolor: red[200],
              borderColor: red[300],
              boxShadow: `0 12px 0 ${red[300]}, 0 20px 32px rgba(0, 0, 0, 0.18)`,
              color: "rgba(255, 255, 255, 0.8)",
            },
          }}
        >
          E-STOP
        </Button>

        <Dialog
          open={estopStatus === "KILLED"}
          onClose={() => setEstopStatus("STANDBY")}
          aria-labelledby="estop-result"
        >
          <DialogTitle color="error" id="estop-result">
            REMOTE KILL SUCCESS
          </DialogTitle>
        </Dialog>
      </Box>
    </>
  );
}
