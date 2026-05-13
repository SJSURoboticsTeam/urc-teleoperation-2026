import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { robotsocket } from "../socket.io/socket";
import { Box, Typography, Switch, FormControlLabel } from "@mui/material";

function isWebglSupported() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });

    return !!(gl && typeof gl.getParameter === "function");
  } catch {
    return false;
  }
}

function LockOnControlUI({ lat, long, lastRead, isLockedOn, onToggle }) {
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
      <Typography variant="body2">Latitude: {lat}</Typography>
      <Typography variant="body2">Longitude: {long}</Typography>
      <Typography variant="body2">Last Read: {lastRead}</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={isLockedOn}
            onChange={onToggle}
            sx={{
              "& .MuiSwitch-thumb": {
                bgcolor: isLockedOn ? "#0a890e" : "#890707",
              },
              "& .MuiSwitch-track": {
                bgcolor: isLockedOn ? "#0a890e" : "#890707",
              },
            }}
          />
        }
        label={<Typography variant="body2">Lock-On</Typography>}
      />
    </Box>
  );
}

class LockOnControl {
  constructor(onToggle) {
    this._latitude = null;
    this._longitude = null;
    this._lastRead = null;
    this._isLockedOn = null;
    this._onToggle = onToggle;
    this._root = null;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    this.update("---", "---", "---", true);
    return this._container;
  }
  update(lat, long, lastRead, isLockedOn) {
    this._latitude = lat;
    this._longitude = long;
    this._lastRead = lastRead;
    this._isLockedOn = isLockedOn;
    if (!this._root) return;
    this._root.render(
      <LockOnControlUI
        lat={lat}
        long={long}
        lastRead={lastRead}
        isLockedOn={isLockedOn}
        onToggle={this._onToggle}
      />,
    );
  }
  onRemove() {
    if (this._root) this._root.unmount();
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._root = null;
    this._container = null;
  }
}

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const marker = useRef(null);
  const controlRef = useRef(null);
  const lastSignalTime = useRef(Date.now());
  const signalDiff = useRef();
  const signalTimeout = useRef(null);
  const [webglSupported, setWebglSupported] = useState(null);

  const [coordinates, setCoordinates] = useState({
    long: -121.881194,
    lat: 37.336847,
    receive: false,
  });

  const [isLockedOn, setIsLockedOn] = useState(true);

  useEffect(() => {
    const supported = isWebglSupported();
    setWebglSupported(supported);
    if (!supported) return;

    const target = [coordinates.long, coordinates.lat];
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

    let map;
    try {
      map = new maplibregl.Map({
        container,
        style: urls,
        center: target,
        zoom: 17,
        pitch: 60,
        bearing: -20,
        maxPitch: 80,
      });
    } catch (e) {
      console.error("MapLibre init failed:", e);
      setWebglSupported(false);
      return;
    }

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    marker.current = new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

    const lockOnControl = new LockOnControl(() =>
      setIsLockedOn((prev) => !prev)
    );

    const onLoad = () => {
      map.addControl(lockOnControl, "bottom-left");
      controlRef.current = lockOnControl;

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
      map.off("load", onLoad);
       // Clean up map instance
      if (map && typeof map.remove === "function") {
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handler = (data) => {
      if (signalTimeout.current) clearTimeout(signalTimeout.current);

      const newTime = Date.now();
      signalDiff.current = (newTime - lastSignalTime.current) / 1000;
      lastSignalTime.current = newTime;

       // console.log("Received GPS data:", data);
      setCoordinates({
        long: data.longitude,
        lat: data.latitude,
        receive: true,
      });

      signalTimeout.current = setTimeout(() => {
        setCoordinates((prev) => ({ ...prev, receive: false }));
      }, 3000);
    };

    robotsocket.on("gpsData", handler);
    signalTimeout.current = setTimeout(() => {
      setCoordinates((prev) => ({ ...prev, receive: false }));
    }, 3000);
    return () => {
      robotsocket.off("gpsData", handler);
      if (signalTimeout.current) clearTimeout(signalTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!webglSupported) return;
    if (!marker.current || !mapRef.current) return;

    marker.current.setLngLat([coordinates.long, coordinates.lat]);

    if (controlRef.current) {
      controlRef.current.update(
        coordinates.lat.toFixed(6),
        coordinates.long.toFixed(6),
        coordinates.receive
          ? signalDiff.current.toFixed(2) + "s ago"
          : "NO SIGNAL",
        isLockedOn,
      );
    }

    if (isLockedOn && mapRef.current) {
      mapRef.current.easeTo({
        center: [coordinates.long, coordinates.lat],
        speed: 3,
        curve: 1,
        essential: true,
      });
    }
    // Use full height so the map fills any explicit-height parent container
  }, [coordinates, isLockedOn, webglSupported]);

if (webglSupported === false) {
  return (
    <div className="w-full flex-1 min-h-0 flex items-center justify-center border-2">
      <div>WebGL wasn't detected. Map can't run.</div>
    </div>

  );
}
  return (
    <div ref={mapContainer} className="w-full flex-1 min-h-0 bg-gray-200" />
  );
}
