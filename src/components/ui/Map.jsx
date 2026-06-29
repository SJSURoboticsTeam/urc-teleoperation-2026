import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { robotsocket, basesocket } from "../socket.io/socket";
import { Box, Typography, Switch, FormControlLabel } from "@mui/material";

function CoordUI({ lat, long, lastRead, color }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(255,255,255,0.9)",
        p: 1,
        borderRadius: 1,
        border: "2px solid",
        borderColor: color,
        minWidth: 180,
      }}
    >
      <Typography variant="body2">Latitude: {lat}</Typography>
      <Typography variant="body2">Longitude: {long}</Typography>
      <Typography variant="body2">Last Read: {lastRead}</Typography>
    </Box>
  );
}

class CoordControl {
  constructor(color) {
    this._latitude = null;
    this._longitude = null;
    this._lastRead = null;
    this.color = color;
    this._root = null;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    this.update("---", "---", "---");
    return this._container;
  }
  update(lat, long, lastRead) {
    if(!this._root) {
      return;
    }
    this._latitude = lat;
    this._longitude = long;
    this._lastRead = lastRead;
    this._root.render(
      <CoordUI
        lat = {lat}  
        long = {long}  
        lastRead = {lastRead}  
        color = {this.color}
      />
    );
  }
  onRemove() {
    if (this._root) {
      this._root.unmount();
    }
    if(this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._root = null;
    this._container = null;
  }
}

function LockOnControlUI({ isLockedOn, isCentered, onToggleLock, onToggleCenter }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(255,255,255,0.9)",
        p: 1,
        borderRadius: 1,
        border: "1px solid black",
        minWidth: 180,
      }}
    >
      <FormControlLabel
        control={
          <Switch
            checked={isLockedOn}
            onChange={onToggleLock}
            sx={{
              "& .MuiSwitch-thumb": { bgcolor: isLockedOn ? "#0a890e" : "#890707" },
              "& .MuiSwitch-track": { bgcolor: isLockedOn ? "#0a890e" : "#890707" },
            }}
          />
        }
        label={<Typography variant="body2">Lock-On</Typography>}
      />
      <FormControlLabel
        control={
          <Switch
            checked={isCentered}
            onChange={onToggleCenter}
            sx={{
              "& .MuiSwitch-thumb": { bgcolor: isCentered ? "#0a890e" : "#890707" },
              "& .MuiSwitch-track": { bgcolor: isCentered ? "#0a890e" : "#890707" },
            }}
          />
        }
        label={<Typography variant="body2">Include Base</Typography>}
      />
    </Box>
  );
}

function createFallbackImage() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = "rgba(70, 70, 70, 0.92)";
  context.fillRect(4, 4, size - 8, size - 8);
  context.scale(0.5, 0.5);

  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();
  context.arc(32, 18, 5, 0, Math.PI * 2);
  context.fill();

  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(32, 28);
  context.lineTo(32, 48);
  context.stroke();

  return context.getImageData(0, 0, size, size);
}

const fallbackImage = createFallbackImage();

class LockOnControl {
  constructor(onToggleLock, onToggleCenter) {
    this._isLockedOn = null;
    this._isCentered = null;
    this._onToggleLock = onToggleLock;
    this._onToggleCenter = onToggleCenter;
    this._root = null;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    this.update(true, false);
    return this._container;
  }
  update(isLockedOn, isCentered) {
    if(!this._root) {
      return;
    }
    this._isLockedOn = isLockedOn;
    this._isCentered = isCentered;
    this._root.render(
      <LockOnControlUI
        isLockedOn = {isLockedOn}  
        isCentered = {isCentered}
        onToggleLock = {this._onToggleLock}
        onToggleCenter = {this._onToggleCenter}
      />
    );
  }
  onRemove() {
    if (this._root) {
      this._root.unmount();
    }
    if(this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._root = null;
    this._container = null;
  }
}

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const robotMarker = useRef(null);
  const baseMarker = useRef(null);
  const controlRef = useRef(null);
  const coordRef = useRef(null);
  const coordRef2 = useRef(null);
  const robotLastSignalTime = useRef(Date.now()); 
  const baseLastSignalTime = useRef(Date.now()); 
  const robotSignalDiff = useRef();
  const baseSignalDiff = useRef();
  const robotSignalTimeout = useRef(null);
  const baseSignalTimeout = useRef(null);

  const [robotCoordinates, setRobotCoordinates] = useState({
    long: -121.881194,
    lat: 37.336847,
    receive: false,
  });

  const [baseCoordinates, setBaseCoordinates] = useState({
    long: -121.881194,
    lat: 37.336847,
    receive: false,
  });

  const [isLockedOn, setIsLockedOn] = useState(true);
  const [isCentered, setIsCentered] = useState(false);

  useEffect(() => {
    const target = [robotCoordinates.long, robotCoordinates.lat];
    //const target = [-121.881194, 37.336847]; // San Jose area 
    //const target = [-110.768401, 38.372207]; // Utah
    // https://www.gps-coordinates.net/ for coordinates

    const urls =
      import.meta.env.MODE === "production" || import.meta.env.MODE === "prod"
        ? "http://192.168.1.2:8080/styles/basic-preview/style.json"
        : "https://tiles.openfreemap.org/styles/bright";
    // Use local tileserver in production, demo for off-network development

    if (mapRef.current) return;

    const container = mapContainer.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: urls,
      center: target,
      zoom: 17,
      pitch: 60,
      bearing: -20,
      maxPitch: 80
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    robotMarker.current = new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

    baseMarker.current = new maplibregl.Marker({ color: "#0077ff" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Base Target"))
      .addTo(map);
    const onStyleImageMissing = (event) => {
      if (map.hasImage(event.id)) {
        return;
      }

      if (fallbackImage) {
        map.addImage(event.id, fallbackImage, { pixelRatio: 2 });
      }
    };

    map.on("styleimagemissing", onStyleImageMissing);

    const lockOnControl = new LockOnControl(() =>
      setIsLockedOn((prev) => !prev), 
      ()  => setIsCentered((prev) => !prev)
    );
    const coordControl = new CoordControl("#ff0000");
    const coordControl2 = new CoordControl("#0077ff");

    const onLoad = () => {
      map.addControl(lockOnControl, "bottom-left");
      controlRef.current = lockOnControl;

      map.addControl(coordControl, "bottom-left");
      coordRef.current = coordControl;

      map.addControl(coordControl2, "bottom-left");
      coordRef2.current = coordControl2;

      // Add 3D buildings only if the style provides the expected source
      const style = map.getStyle && map.getStyle();
      const sources = style && style.sources ? Object.keys(style.sources) : [];
      if (sources.includes("openmaptiles")) {
        try {
          map.addLayer({
            id: "3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 15,
            paint: {
              "fill-extrusion-color": "#aaa",
              "fill-extrusion-height": ["get", "render_height"],
              "fill-extrusion-base": ["get", "render_min_height"],
              "fill-extrusion-opacity": 0.9,
            },
          });
        } catch (e) {
          // If adding the layer fails, don't crash the whole map
          console.warn("Could not add 3D-buildings layer:", e);
        }
      }
    };

    map.on("load", onLoad);

    // Ensure first paint uses the correct container size.
    const initialResizeRaf = requestAnimationFrame(() => map.resize());

    const onWindowResize = () => map.resize();
    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelAnimationFrame(initialResizeRaf);
      window.removeEventListener("resize", onWindowResize);
      map.off("styleimagemissing", onStyleImageMissing);
      map.off("load", onLoad);
      // Clean up map instance
      if (map && typeof map.remove === "function") {
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const robotHandler = (data) => {
      if (robotSignalTimeout.current) {
        clearTimeout(robotSignalTimeout.current);
      }

      const newTime = Date.now();
      robotSignalDiff.current = (newTime - robotLastSignalTime.current) / 1000;
      robotLastSignalTime.current = newTime;

      // console.log("Received GPS data:", data);
      setRobotCoordinates({
        long: data.longitude,
        lat: data.latitude,
        receive: true,
      });

      robotSignalTimeout.current = setTimeout(() => {
        setRobotCoordinates((prev) => ({ ...prev, receive: false }));
      }, 3000);
    };

    const baseHandler = (data) => {
      if (baseSignalTimeout.current) {
        clearTimeout(baseSignalTimeout.current);
      }

      const newTime = Date.now();
      baseSignalDiff.current = (newTime - baseLastSignalTime.current) / 1000;
      baseLastSignalTime.current = newTime;

      // console.log("Received GPS data:", data);
      setBaseCoordinates({
        long: data.longitude,
        lat: data.latitude,
        receive: true,
      });

      baseSignalTimeout.current = setTimeout(() => {
        setBaseCoordinates((prev) => ({ ...prev, receive: false }));
      }, 3000);
    };

    robotsocket.on("gpsData", robotHandler);
    basesocket.on("gpsData2", baseHandler);
    basesocket
    robotSignalTimeout.current = setTimeout(() => {
      setRobotCoordinates((prev) => ({ ...prev, receive: false }));
    }, 3000);
    baseSignalTimeout.current = setTimeout(() => {
      setBaseCoordinates((prev) => ({ ...prev, receive: false }));
    }, 3000);
    return () => {
      robotsocket.off("gpsData", robotHandler);
      basesocket.off("gpsData2", baseHandler);
      if (robotSignalTimeout.current) {
        clearTimeout(robotSignalTimeout.current);
      }
      if (baseSignalTimeout.current) {
        clearTimeout(baseSignalTimeout.current);
      }
    }
  }, []);

  useEffect(() => {
    robotMarker.current.setLngLat([robotCoordinates.long, robotCoordinates.lat]);
    baseMarker.current.setLngLat([baseCoordinates.long, baseCoordinates.lat]);

    if(coordRef.current) {
      coordRef.current.update(
        robotCoordinates.lat.toFixed(6),
        robotCoordinates.long.toFixed(6),
        robotCoordinates.receive ? robotSignalDiff.current.toFixed(2) + "s ago" : "NO SIGNAL",
      );
    }

    if(coordRef2.current) {
      coordRef2.current.update(
        baseCoordinates.lat.toFixed(6),
        baseCoordinates.long.toFixed(6),
        baseCoordinates.receive ? baseSignalDiff.current.toFixed(2) + "s ago" : "NO SIGNAL",
      );
    }

    if(isLockedOn && mapRef.current) {
      if(!isCentered) {
        mapRef.current.easeTo({
          center: [robotCoordinates.long, robotCoordinates.lat],
          speed: 3,
          curve: 1,
          essential: true,
        });
      } else {
          mapRef.current.easeTo({
            center: [(robotCoordinates.long + baseCoordinates.long) / 2, (robotCoordinates.lat + baseCoordinates.lat) / 2],
            speed: 3,
            curve: 1,
            essential: true,
          });
      }
    }

    if(controlRef.current) {
      controlRef.current.update(isLockedOn, isCentered);
    }
    return () => {

    }
  }, [robotCoordinates, baseCoordinates, isLockedOn, isCentered]);

  // Use full height so the map fills any explicit-height parent container
  return <div ref={mapContainer} className="w-full flex-1 min-h-0 bg-gray-200" />;
}
