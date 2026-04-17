import React, { use, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { robotsocket } from "../socket.io/socket";

class LockOnControl {
  constructor(latLabelRef, longLabelRef, signalRef, buttonRef, onToggle) {
    this._latLabelRef = latLabelRef;
    this._longLabelRef = longLabelRef;
    this._signalRef = signalRef;
    this._buttonRef = buttonRef;
    this._onToggle = onToggle;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._container.style.display = "flex";
    this._container.style.flexDirection = "column";
    this._container.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
    this._container.style.padding = "6px";
    this._container.style.borderRadius = "4px";
    this._container.style.borderColor = "black";
    this._container.style.borderStyle = "solid";
    this._container.style.borderWidth = "1px";

    this._latLabel = document.createElement("span");
    this._latLabel.textContent = "Latitude: --- ";
    this._latLabelRef.current = this._latLabel;

    this._longLabel = document.createElement("span");
    this._longLabel.textContent = "Longitude: ---";
    this._longLabelRef.current = this._longLabel;

    this._signal = document.createElement("span");
    this._signal.textContent = "Last Read: ---";
    this._signalRef.current = this._signal;

    this._wrapper = document.createElement("div");
    this._wrapper.style.display = "flex";
    this._wrapper.style.alignItems = "center";
    this._wrapper.style.gap = "10px";
    this._wrapper.style.padding = "4px";
    this._toggleLabel = document.createElement("span");
    this._toggleLabel.textContent = "Lock-On";
    this._button = document.createElement("input");
    this._button.type = "checkbox";
    this._button.id = "switch";
    this._button.textContent = "Toggle Lock-On";
    this._style = document.createElement("label");
    this._style.htmlFor = "switch";
    this._style.className = "toggle";
    this._buttonRef.current = this._button;
    this._button.addEventListener("click", () => this._onToggle());

    this._wrapper.appendChild(this._toggleLabel);
    this._wrapper.appendChild(this._button);
    this._wrapper.appendChild(this._style);

    const style = document.createElement("style");
    style.textContent = `
        .toggle {
            width: 40px;
            height: 20px;
            background: #890707;
            border-radius: 20px;
            position: relative;
            cursor: pointer;
            display: inline-block;
            transition: background 0.2;
        }
        .toggle::before {
            content: "";
            position: absolute;
            top: 1px;
            left: 2px;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            transition: left 0.2;
        }
        input {
          display: none;  
        }
        input:checked + .toggle {
            background: #0a890e;
        }
        input:checked + .toggle::before {
            left: 21px;
        }
    `;
    this._container.appendChild(style);

    this._container.appendChild(this._latLabel);
    this._container.appendChild(this._longLabel);
    this._container.appendChild(this._signal);
    this._container.appendChild(this._wrapper);
    return this._container;
  }
  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._latLabelRef.current = null;
    this._longLabelRef.current = null;
    this._signalRef.current = null;
    this._buttonRef.current = null;
  }
}

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const marker = useRef(null);
  const latLabelRef = useRef(null);
  const longLabelRef = useRef(null);
  const signalRef = useRef(null);
  const buttonRef = useRef(null);

  const [coordinates, setCoordinates] = useState({
    long:0,
    lat:0
  });

  const [lastSignalTime, setLastSignalTime] = useState({
    time: 0,
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
      zoom: 3,
      pitch: 0,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    const lockOnControl = new LockOnControl(latLabelRef, longLabelRef, signalRef, buttonRef, () =>
      setIsLockedOn((prev) => !prev)
    );
    map.addControl(lockOnControl, "bottom-left");

    marker.current = new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

    const onLoad = () => {
      // Smooth camera fly-in
      // map.flyTo({
      //   center: target,
      //   zoom: 18,
      //   speed: 3,
      //   curve: 1,
      //   essential: true,
      //   pitch: 60,
      //   bearing: -20,
      // });

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
    const handler = (data) => {
      console.log("Received GPS data:", data);
      setCoordinates({
        long: data.longitude,
        lat: data.latitude,
      });
      setLastSignalTime({
        time: data.time,
      });
    };

    robotsocket.on("gpsData", handler);
    marker.current.setLngLat([coordinates.long, coordinates.lat]);

    if(latLabelRef.current) {
      latLabelRef.current.textContent = `Latitude: ${coordinates.lat.toFixed(4)}`;
    }
    if(longLabelRef.current) {
      longLabelRef.current.textContent = `Longitude: ${coordinates.long.toFixed(4)}`;
    }
    if(signalRef.current) {
      signalRef.current.textContent = `Last Read: ${lastSignalTime.time.toFixed(2)}s ago`;
    }

    if(isLockedOn && mapRef.current) {
      mapRef.current.flyTo({
        center: [coordinates.long, coordinates.lat],
        zoom: 18,
        speed: 3,
        curve: 1,
        essential: true,
        pitch: 60,
        bearing: -20,
      });
      buttonRef.current.style.backgroundColor = "#276221"; // Green when locked on
    }
    if(!isLockedOn) {
      buttonRef.current.style.backgroundColor = "#880808"; // Red when not locked on
    }
    return () => {
      robotsocket.off("gpsData", handler);
    }
  }, [coordinates]);

  // Use full height so the map fills any explicit-height parent container
  return <div ref={mapContainer} className="w-full h-full bg-gray-200" />;
}
