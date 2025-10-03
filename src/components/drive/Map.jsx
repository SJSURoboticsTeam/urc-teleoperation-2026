import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const target = [-121.875329832, 37.334665328]; // San Jose area

  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/globe.json",
      center: target,
      zoom: 3,
      pitch: 0,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

    map.on("load", () => {
      // 🧭 Smooth camera fly-in
      map.flyTo({
        center: target,
        zoom: 17,
        speed: 3.0,
        curve: 1,
        essential: true,
        pitch: 60,      // tilt for 3D view
        bearing: -20    // slight rotation for effect
      });

      // 🏙️ Add 3D building layer AFTER style loads
      map.addLayer({
        id: "3d-buildings",
        source: "openmaptiles",       // must match your style.json source name
        "source-layer": "building",   // typical OpenMapTiles layer name
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": ["get", "render_height"],
          "fill-extrusion-base": ["get", "render_min_height"],
          "fill-extrusion-opacity": 0.9
        }
      });
    });
  }, []);

  return <div ref={mapContainer} style={{ width: "100vw", height: "100vh" }} />;
}