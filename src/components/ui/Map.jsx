import React, { use, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { robotsocket } from "../socket.io/socket";
import { Box, Typography, Switch, FormControlLabel } from "@mui/material";

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
      <Typography variant="body2">Last Read: {lastRead}s ago</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={isLockedOn}
            onChange={onToggle}
            sx={{
              "& .MuiSwitch-thumb": { bgcolor: isLockedOn ? "#0a890e" : "#890707" },
              "& .MuiSwitch-track": { bgcolor: isLockedOn ? "#0a890e)" : "#890707" },
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
    this._onToggle = onToggle;
    this._root = null;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    this.update("---", "---", "---", false);
    return this._container;
  }
  update(lat, long, lastRead, isLockedOn) {
    if(!this._root) {
      return;
    }
    this._root.render(
      <LockOnControlUI
        lat = {lat}  
        long = {long}  
        lastRead = {lastRead}  
        isLockedOn = {isLockedOn}  
        onToggle = {this._onToggle}
      />
    );
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._root = null;
  }
}

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const marker = useRef(null);
  const controlRef = useRef(null);
  const lastSignalTime = useRef(Date.now()); 

  const [coordinates, setCoordinates] = useState({
    long: -121.881194,
    lat: 37.336847
  });

  const [isLockedOn, setIsLockedOn] = useState(false);

  useEffect(() => {
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

    const map = new maplibregl.Map({
      container,
      style: urls,
      center: target,
      zoom: 17,
      pitch: 60,
      bearing: -20
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    marker.current = new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

    const lockOnControl = new LockOnControl(() =>
      setIsLockedOn((prev) => !prev)
    )

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

    // ResizeObserver keeps the map in sync with container size changes
    const ro = new ResizeObserver(() => {
      if (map && typeof map.resize === "function") map.resize();
    });
    ro.observe(container);

    // ensure initial sizing
    setTimeout(() => map.resize(), 0);

    return () => {
      ro.disconnect();
      map.off("load", onLoad);
      // Clean up map instance
      if (map && typeof map.remove === "function") {
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const newTime = Date.now();
    const signalDiff = (newTime - lastSignalTime.current) / 1000;
    lastSignalTime.current = newTime;
    const handler = (data) => {
      console.log("Received GPS data:", data);
      setCoordinates({
        long: data.longitude,
        lat: data.latitude,
      });
    };

    robotsocket.on("gpsData", handler);
    marker.current.setLngLat([coordinates.long, coordinates.lat]);

    if(controlRef.current) {
      controlRef.current.update(
        coordinates.lat.toFixed(4),
        coordinates.long.toFixed(4),
        signalDiff.toFixed(2),
        isLockedOn,
      );
    }

    if(isLockedOn && mapRef.current) {
      mapRef.current.easeTo({
        center: [coordinates.long, coordinates.lat],
        speed: 3,
        curve: 1,
        essential: true,
      });
      //buttonRef.current.style.backgroundColor = "#276221"; // Green when locked on
    }
    return () => {
      robotsocket.off("gpsData", handler);
    }
  }, [coordinates]);

  // Use full height so the map fills any explicit-height parent container
  return <div ref={mapContainer} className="w-full h-full bg-gray-200" />;
}
