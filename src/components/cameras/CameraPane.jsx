import "react-resizable/css/styles.css";
import Box from "@mui/material/Box";
import { useVideo } from "../../contexts/VideoContext";
import { useState, useEffect, useRef } from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Typography,
  Button,
  Chip,
  Tooltip,
} from "@mui/material";
import { CAMERA_OPTIONS, DEFAULT_CAMERA } from "./cameraList";

export default function CameraPane({ cameraValue, onCameraChange }) {
  const isWebDemo = import.meta.env.MODE === "demo";
  const [camera, setCamera] = useState(cameraValue ?? DEFAULT_CAMERA);

  useEffect(() => {
    if (cameraValue !== undefined) {
      setCamera(cameraValue);
    }
  }, [cameraValue]);

  const handleChange = (event) => {
    setCamera(event.target.value);
    const nextValue = event.target.value;
    setCamera(nextValue);
    if (onCameraChange) {
      onCameraChange(nextValue);
    }
  };

  const cameras = CAMERA_OPTIONS;

  const cameraToVideoMap = {
    mast : "mast",
    wheels: "wheels",
    scout: "scout",
    feet : "feet",
    module1: "module1",
    module2: "module2",
  };

  const selectedCamera = cameras.find((cam) => cam.value == camera);
  
  const videoStats = useVideo();
  const videoKey = cameraToVideoMap[camera];
  const currentVideoStat = videoKey ? videoStats[videoKey] : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeTimeoutRef = useRef(null);

  // derive simple deps for the effect so lint can verify
  const selectedUrl = selectedCamera?.url ?? null;
  const selectedMediaType = selectedCamera?.mediatype ?? null;

  // True once the stream server has answered the reachability probe; the
  // iframe is only mounted after that.
  const [reachable, setReachable] = useState(false);
  // Bumped by the Retry button to rerun the effect below for the same camera.
  const [retryCount, setRetryCount] = useState(0);

  // Whenever the camera changes (or Retry is pressed), reset loading/error and,
  // for iframe streams, probe the endpoint before mounting the iframe.
  //
  // Why probe: Chrome fires the iframe's onLoad even when it renders its own
  // "refused to connect" page, and the cross-origin frame can't be inspected,
  // so onLoad alone can't tell success from failure. A no-cors fetch rejects
  // on a network failure (refused, unreachable, DNS) but resolves for any HTTP
  // response, which is enough to know the stream server is up.
  useEffect(() => {
    setLoading(true);
    setError(false);
    setReachable(false);

    if (isWebDemo) {
      setLoading(false);
      setError(selectedMediaType === "iframe");
      return;
    }

    if (selectedMediaType !== "iframe" || !selectedUrl) return;

    let cancelled = false;
    const controller = new AbortController();
    const fail = () => {
      if (cancelled) return;
      cancelled = true;
      controller.abort();
      setLoading(false);
      setError(true);
    };

    // One deadline covers both the probe and the iframe's load; iframe onLoad
    // clears it.
    iframeTimeoutRef.current = setTimeout(fail, 5000);

    fetch(selectedUrl, {
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(() => {
        if (!cancelled) setReachable(true);
      })
      .catch(fail);

    return () => {
      cancelled = true;
      controller.abort();
      if (iframeTimeoutRef.current) {
        clearTimeout(iframeTimeoutRef.current);
        iframeTimeoutRef.current = null;
      }
    };
  }, [selectedUrl, selectedMediaType, isWebDemo, retryCount]);

  return (
    // Root Box is flexible so CameraPane can grow inside a column
    <Box
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <FormControl
        fullWidth
        variant="outlined"
        sx={{
          mt: 1,
          mb: 0.5,
        }}
      >
        <InputLabel id="camera-select-label">Camera</InputLabel>
        <Select
          labelId="camera-select-label"
          id="camera-select"
          value={camera}
          label="Camera"
          onChange={handleChange}
          size="small"
          sx={{ fontSize: "0.9rem" }}
          MenuProps={{
            // Render menu in a portal so it isn't clipped by ancestor overflow
            disablePortal: false,
            // give the menu a high z-index so it appears above other elements
            PaperProps: { sx: { zIndex: 3000 } },
          }}
        >
          {cameras.map((cam) => (
            <MenuItem disabled={!cam.allowed} key={cam.value} value={cam.value}>
              {cam.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* image container grows to fill remaining space */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          backgroundColor: error ? "black" : "transparent",
        }}
      >
        {currentVideoStat && (
        <Tooltip
          title={
            currentVideoStat.droppedPerSec != null
              ? `Dropped frames: ${currentVideoStat.droppedPerSec}/sec`
              : "Stats unavailable"
          }
        >
          <Chip
            size="small"
            aria-live="polite"
            label={currentVideoStat.status}
            color={
              currentVideoStat.status === "GOOD" ? "success" :
              currentVideoStat.status === "DEGRADED" ? "warning" :
              currentVideoStat.status === "BAD" ? "error" : "default"
            }
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 2,
              height: 18,
              fontSize: "0.65rem",
              "& .MuiChip-label": { px: 0.75 },
              ...(!["GOOD", "DEGRADED", "BAD"].includes(currentVideoStat.status) && {
                bgcolor: "#e0e0e0",
                color: "#000",
                fontWeight: 600,
    }),
            }}
          />
        </Tooltip>
      )}
        {selectedCamera && (
          (selectedCamera.mediatype === "image" ? (
            <img
              key={`${selectedCamera.url}#${retryCount}`}
              src={selectedCamera.url}
              alt={selectedCamera.name}
              onLoad={() => {
                setLoading(false);
                setError(false);
              }}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            // if error, iframe does not show to prevent browser error messages
            !error && reachable && (
              <iframe
                key={selectedCamera.url}
                src={selectedCamera.url}
                onLoad={() => {
                  if (iframeTimeoutRef.current) {
                    clearTimeout(iframeTimeoutRef.current);
                    iframeTimeoutRef.current = null;
                  }
                  setLoading(false);
                  setError(false);
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                  display: "block",
                }}
                title={selectedCamera.name}
                allow="fullscreen;"
              />
            )
          ))
        )}

        {/* loading / error overlays */}
        {!isWebDemo && loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <CircularProgress color="inherit" />
          </Box>
        )}

        {error && (
          <Box
            sx={{
              position: "absolute",
              flex: 1,
              minHeight: 0,
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              p: 2,
            }}
          >
            <Box
              component="img"
              src={`${import.meta.env.BASE_URL}sjsu_robotics_logo.png`}
              alt=""
              sx={{
                flex: "1 1 0",
                minWidth: 0,
                minHeight: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transform: "scale(0.75)",
                animation: "camera-logo-spin 5s linear infinite",
                "@keyframes camera-logo-spin": {
                  from: { transform: "scale(0.75) perspective(1000px) rotateY(0deg)" },
                  to: { transform: "scale(0.75) perspective(1000px) rotateY(-360deg)" },
                },
              }}
            />
            <Typography color="error">
              {isWebDemo
                ? "Cameras are unavailable in the web demo"
                : "Couldn't connect to video endpoint."}
            </Typography>
            {!isWebDemo && (
              <Button
                sx={{ mt: 1 }}
                variant="contained"
                onClick={() => {
                  setRetryCount((count) => count + 1);
                }}
              >
                Retry
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
