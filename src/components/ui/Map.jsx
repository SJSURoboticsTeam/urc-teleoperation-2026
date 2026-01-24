import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const target = [-121.881194, 37.336847]; // San Jose area
    //const target = [-110.768401, 38.372207]; // Utah
    // https://www.gps-coordinates.net/ for coordinates
 

    const urls = (import.meta.env.MODE === "production" || import.meta.env.MODE === "prod")
    ? "http://192.168.1.2:8080/styles/basic-preview/style.json"
    : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
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

    new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

  const onLoad = () => {
      // Smooth camera fly-in
      map.flyTo({
        center: target,
        zoom: 18,
        speed: 3,
        curve: 1,
        essential: true,
        pitch: 60,
        bearing: -20,
      });

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

  // Use full height so the map fills any explicit-height parent container
  return <div ref={mapContainer} className="w-full h-full bg-gray-200" />;
}