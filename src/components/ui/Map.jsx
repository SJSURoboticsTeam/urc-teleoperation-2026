import React, {useEffect, useRef, useState, useCallback, useLayoutEffect} from "react";
import ReactDOM from "react-dom/client";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button, Box, Typography, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useGPS } from "../../contexts/GPSContext";
import { createTrailUpdater, serializeTrailLog, parseTrailLog, importedTrailGeoJSON } from "../../lib/gpsTrail";

const TRAIL_SOURCE = "rover-gps-trail";
const IMPORTED_TRAIL_SOURCE = "imported-gps-trail";

function TrailControlUI({ points, ready, recording, hasUnsavedTrail, onStart, onStop, onClear, importedTrail, onImport, onClearImport }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef(null);

  const importLog = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    setIsImporting(true);
    try {
      const points = parseTrailLog(await file.text());
      onImport({ name: file.name, points });
    } catch (error) {
      setImportError(error.message || "Could not read this trail log.");
    } finally {
      setIsImporting(false);
    }
  };

  const exportLog = () => {
    const blob = new Blob([serializeTrailLog(points)], { type: "application/x-ndjson;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // File name of the log is a timestamp of when it was downloaded
    link.download = `rover-gps-trail-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Box sx={{ bgcolor: "rgba(255,255,255,0.94)", p: 1, border: "1px solid black", borderRadius: 1, minWidth: 180, maxWidth: 180, "& .MuiButton-root": { minWidth: 0, px: 0.5, fontSize: "12px" } }}>
      <Typography variant="body2" fontWeight="bold">GPS Trail · {points.length} {points.length === 1 ? "point" : "points"}</Typography>
      <Typography variant="caption" color={recording ? "success.main" : "text.secondary"}>
        {recording ? "Recording" : "Not recording"}
      </Typography>
      {hasUnsavedTrail && (
        <Typography role="alert" variant="body2" color="error.main">
          Trail changes could not be saved. Export Log before reloading or closing this page.
        </Typography>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        <Button size="small" variant="contained" disabled={!ready || recording} onClick={onStart}>Start Recording</Button>
        <Button size="small" variant="outlined" disabled={!recording} onClick={onStop}>Stop Recording</Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        <Button size="small" variant="outlined" disabled={!ready || points.length === 0} onClick={exportLog}>Export Log</Button>
        <Button size="small" color="error" variant="outlined" disabled={!ready || points.length === 0} onClick={() => setConfirmClear(true)}>Clear Trail</Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        <Button size="small" variant="outlined" disabled={!ready || isImporting} onClick={() => importInputRef.current?.click()}>
          {isImporting ? "Importing…" : "Import Log"}
        </Button>
        <Button size="small" variant="outlined" disabled={!importedTrail} onClick={onClearImport}>Clear Import</Button>
      </Box>
      <input ref={importInputRef} type="file" accept=".log" aria-label="Import GPS trail log" hidden onChange={importLog} />
      {importError && <Typography role="alert" variant="body2" color="error.main">{importError}</Typography>}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Clear GPS trail?</DialogTitle>
        <DialogContent>This removes all saved trail points from this browser. Export a log first if you want to keep them.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
          <Button color="error" onClick={() => { onClear(); setConfirmClear(false); }}>Clear Trail</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

class TrailControl {
  onAdd() {
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    return this._container;
  }
  update(points, ready, recording, hasUnsavedTrail, onStart, onStop, onClear, importedTrail, onImport, onClearImport) {
    this._root?.render(<TrailControlUI points={points} ready={ready} recording={recording} hasUnsavedTrail={hasUnsavedTrail} onStart={onStart} onStop={onStop} onClear={onClear} importedTrail={importedTrail} onImport={onImport} onClearImport={onClearImport} />);
  }
  onRemove() {
    this._root?.unmount();
    this._container?.remove();
    this._root = null;
    this._container = null;
  }
}


// MapLibre v6 loads its worker from a URL Vite can't detect, so bundle it explicitly
maplibregl.setWorkerUrl(maplibreWorkerUrl);

function CoordUI({ lat, long, lastRead, color, distanceMeters, headingDegrees }) {
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
      {distanceMeters !== undefined && (
        <>
          <Typography variant="body2">
            Distance to Robot: {Number.isFinite(distanceMeters) ? `${distanceMeters.toFixed(1)} m` : "--"}
          </Typography>
          <Typography variant="body2">
            Heading to Robot: {Number.isFinite(headingDegrees) ? `${headingDegrees.toFixed(1)}°` : "--"}
          </Typography>
        </>
      )}
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
  update(lat, long, lastRead, distanceMeters, headingDegrees) {
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
        distanceMeters = {distanceMeters}
        headingDegrees = {headingDegrees}
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

function ResetZoomControlUI({ onClickZoom, onClickPan }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "rgba(255,255,255,0.9)",
        p: 1,
        borderRadius: 1,
        border: "1px solid black",
        minWidth: 100,
      }}
    >
      <Button size="small" variant="outlined" onClick = {onClickZoom}>Reset Zoom</Button>
      <Button size="small" variant="outlined" onClick = {onClickPan}>Reset Pan</Button>
    </Box>
  );
}

class ResetZoomControl {
  constructor(onClickZoom, onClickPan) {
    this._onClickZoom = onClickZoom;
    this._onClickPan = onClickPan;
    this._root = null;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    this.update();
    return this._container;
  }
  update() {
    if(!this._root) {
      return;
    }
    this._root.render(
      <ResetZoomControlUI
        onClickZoom = {this._onClickZoom}
        onClickPan = {this._onClickPan}
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

// MapLibre auto-expands the compact attribution whenever attributions load and
// only collapses it on the first drag. Keep it collapsed until the user clicks.
class CollapsedAttributionControl extends maplibregl.AttributionControl {
  constructor() {
    super({ compact: true });
  }

  _updateAttributions() {
    super._updateAttributions();
    this._container?.classList.remove("maplibregl-compact-show");
  }
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

function metersToPixels(lat, zoom, meters) {
  const metersPerPixel =
    (40075016.686 * Math.cos((lat * Math.PI) / 180)) /
    (512 * Math.pow(2, zoom));
  return meters / metersPerPixel;
}

function updateAccuracyRadius(map, layerId, coords) {
  const radius =
    coords.receive && coords.accuracy_m
      ? metersToPixels(coords.lat, map.getZoom(), coords.accuracy_m)
      : 0;
  map.setPaintProperty(layerId, "circle-radius", radius);
}

function updateAccuracyCircle(map, sourceId, layerId, coords) {
  const source = map.getSource(sourceId);
  if (!source) return;

  source.setData({
    type: "Feature",
    geometry: { type: "Point", coordinates: [coords.long, coords.lat] },
  });
  updateAccuracyRadius(map, layerId, coords);
}

export default function Map() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const robotMarker = useRef(null);
  const baseMarker = useRef(null);
  const controlRef = useRef(null);
  const coordRef = useRef(null);
  const coordRef2 = useRef(null);
  const resetZoomRef = useRef(null);
  const suppressTrackRef = useRef(false);

  const trailControlRef = useRef(null);
  const trailPointsRef = useRef([]);
  const trailControlStateRef = useRef(null);
  const trailUpdaterRef = useRef(null);

  const [isLockedOn, setIsLockedOn] = useState(true);
  const [isCentered, setIsCentered] = useState(false);
  const [webglSupported, setWebglSupported] = useState(null);
  const [importedTrail, setImportedTrail] = useState(null);

  const importTrail = useCallback((trail) => {
    setImportedTrail(trail);
    // setIsLockedOn(false);
  }, []);
  const clearImportedTrail = useCallback(() => setImportedTrail(null), []);

  const { robotCoordinates, baseCoordinates, robotSignalDiff, baseSignalDiff, trailPoints, trailReady, isRecording, hasUnsavedTrail, startRecording, stopRecording, clearTrail } = useGPS();
  trailPointsRef.current = trailPoints;
  trailControlStateRef.current = { trailReady,isRecording, hasUnsavedTrail, startRecording, stopRecording, clearTrail, importedTrail, importTrail, clearImportedTrail };

  const robotCoordsRef = useRef(robotCoordinates);
  const baseCoordsRef = useRef(baseCoordinates);
  useLayoutEffect(() => {
    robotCoordsRef.current = robotCoordinates;
    baseCoordsRef.current = baseCoordinates;
  }, [robotCoordinates, baseCoordinates]);

  function resetMapCam(easeOptions) {
    if (!mapRef.current) { return; }
    const duration = 500;
    suppressTrackRef.current = true;

    mapRef.current.easeTo({ ...easeOptions, duration });

    setTimeout(() => {
      suppressTrackRef.current = false;
    }, duration + 100);
  }

  useEffect(() => {
    const supported = isWebglSupported();
    setWebglSupported(supported);
    if (supported === false) return;
    if (webglSupported === false) return;

    const target = [robotCoordinates.long, robotCoordinates.lat];
    //const target = [-121.881194, 37.336847]; // San Jose area
    //const target = [-110.768401, 38.372207]; // Utah
    // https://www.gps-coordinates.net/ for coordinates

    const urls =
      (import.meta.env.MODE === "prod")
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
      attributionControl: false
    });
    } catch(e) {
      console.error("MapLibre init failed:", e);
      setWebglSupported(false);
      return;
    }

    mapRef.current = map;

    // Added before the zoom controls so it stacks above them
    map.addControl(new CollapsedAttributionControl(), "top-right");
    const onStyleImageMissing = ({ id }) => {
      if (!map.hasImage(id) && fallbackImage) {
        map.addImage(id, fallbackImage, { pixelRatio: 2 });
      }
    };
    map.on("styleimagemissing", onStyleImageMissing);

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    robotMarker.current = new maplibregl.Marker({ color: "#ff0000" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Robot Target"))
      .addTo(map);

    baseMarker.current = new maplibregl.Marker({ color: "#0077ff" })
      .setLngLat(target)
      .setPopup(new maplibregl.Popup().setText("Base Target"))
      .addTo(map);
    const lockOnControl = new LockOnControl(() =>
      setIsLockedOn((prev) => !prev),
      ()  => setIsCentered((prev) => !prev)
    );
    const coordControl = new CoordControl("#ff0000");
    const coordControl2 = new CoordControl("#0077ff");

    const resetZoomControl = new ResetZoomControl(
      () => resetMapCam({ zoom: 17 }),
      () => resetMapCam({ pitch: 60, bearing: -20 })
    );

    const onZoom = () => {
      updateAccuracyRadius(map, "robot-accuracy-circle-layer", robotCoordsRef.current);
      updateAccuracyRadius(map, "base-accuracy-circle-layer", baseCoordsRef.current);
    };

    const onLoad = () => {
      map.addControl(lockOnControl, "bottom-left");
      controlRef.current = lockOnControl;

      map.addControl(coordControl, "bottom-left");
      coordRef.current = coordControl;

      map.addControl(coordControl2, "bottom-left");
      coordRef2.current = coordControl2;

      map.addControl(resetZoomControl, "top-left");
      resetZoomRef.current = resetZoomControl;

      const trailControl = new TrailControl();
      map.addControl(trailControl, "bottom-right");
      trailControlRef.current = trailControl;
      const currentTrailState = trailControlStateRef.current;
      trailControl.update(trailPointsRef.current, currentTrailState.trailReady, currentTrailState.isRecording, currentTrailState.hasUnsavedTrail, currentTrailState.startRecording, currentTrailState.stopRecording, currentTrailState.clearTrail, currentTrailState.importedTrail, currentTrailState.importTrail, currentTrailState.clearImportedTrail);

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

      // Add the GPS trail source and layer to the map
      const trailUpdater = createTrailUpdater();
      const initialTrail = trailUpdater.update(trailPointsRef.current);
      trailUpdaterRef.current = trailUpdater;
      map.addSource(TRAIL_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: initialTrail.add ?? [] },
      });

      // Draws lines through each point
      map.addLayer({
        id: TRAIL_SOURCE,
        type: "line",
        source: TRAIL_SOURCE,
        filter: ["all", ["==", ["geometry-type"], "LineString"], ["!=", ["get", "gap"], true]],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#e65100", "line-width": 4, "line-opacity": 0.9 },
      });

      // Draw dotted lines signifying recording pauses, gaps over 15 secs, and invalid GPS readings.
      map.addLayer({
        id: `${TRAIL_SOURCE}-gaps`,
        type: "line",
        source: TRAIL_SOURCE,
        filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "gap"], true]],
        layout: { "line-cap": "round" },
        paint: { "line-color": "#e65100", "line-width": 4, "line-opacity": 0.7, "line-dasharray": [0.5, 2] },
      });

      // Draws circles at each point to represent a line segment
      map.addLayer({
        id: `${TRAIL_SOURCE}-points`,
        type: "circle",
        source: TRAIL_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": ["case", ["==", ["get", "start"], true], 7, 4],
          "circle-color": ["case", ["==", ["get", "start"], true], "#2e7d32", "#e65100"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        },
      });

      // Draw imported trails
      map.addSource(IMPORTED_TRAIL_SOURCE, {
        type: "geojson",
        data: importedTrailGeoJSON(currentTrailState.importedTrail?.points ?? []),
      });
      map.addLayer({
        id: IMPORTED_TRAIL_SOURCE,
        type: "line",
        source: IMPORTED_TRAIL_SOURCE,
        filter: ["all", ["==", ["geometry-type"], "LineString"], ["!=", ["get", "gap"], true]],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ce59f8", "line-width": 4, "line-opacity": 0.9 },
      });
      map.addLayer({
        id: `${IMPORTED_TRAIL_SOURCE}-gaps`,
        type: "line",
        source: IMPORTED_TRAIL_SOURCE,
        filter: ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "gap"], true]],
        layout: { "line-cap": "round" },
        paint: { "line-color": "#ce59f8", "line-width": 4, "line-opacity": 0.7, "line-dasharray": [0.5, 2] },
      });
      map.addLayer({
        id: `${IMPORTED_TRAIL_SOURCE}-points`,
        type: "circle",
        source: IMPORTED_TRAIL_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": ["case", ["any", ["==", ["get", "start"], true], ["==", ["get", "end"], true]], 7, 4],
          "circle-color": ["case", ["==", ["get", "start"], true], "#2e7d32", ["==", ["get", "end"], true], "#d32f2f", "#ce59f8"],
          "circle-stroke-color": ["case", ["all", ["==", ["get", "start"], true], ["==", ["get", "end"], true]], "#d32f2f", "#ffffff"],
          "circle-stroke-width": ["case", ["all", ["==", ["get", "start"], true], ["==", ["get", "end"], true]], 3, 1.5],
        },
      });
      map.addSource('robot-accuracy-circle', {
          type: 'geojson',
          data: {
              type: 'Feature',
              geometry: {
                  type: 'Point',
                  coordinates: [robotCoordinates.long, robotCoordinates.lat],
              }
          }
      });

      map.addLayer({
          id: 'robot-accuracy-circle-layer',
          type: 'circle',
          source: 'robot-accuracy-circle',
          paint: {
              'circle-radius': 0,  // updated dynamically
              'circle-color': 'rgba(0, 120, 255, 0.15)',
              'circle-stroke-color': 'rgba(0, 120, 255, 0.8)',
              'circle-stroke-width': 2,
              'circle-pitch-alignment': 'map',
          }
      });

      map.addSource('base-accuracy-circle', {
          type: 'geojson',
          data: {
              type: 'Feature',
              geometry: {
                  type: 'Point',
                  coordinates: [baseCoordinates.long, baseCoordinates.lat],
              }
          }
      });

      map.addLayer({
          id: 'base-accuracy-circle-layer',
          type: 'circle',
          source: 'base-accuracy-circle',
          paint: {
              'circle-radius': 0,  // updated dynamically
              'circle-color': 'rgba(0, 120, 255, 0.15)',
              'circle-stroke-color': 'rgba(0, 120, 255, 0.8)',
              'circle-stroke-width': 2,
              'circle-pitch-alignment': 'map',
          }
      });
      map.on("zoom", onZoom);

      updateAccuracyCircle(map, "robot-accuracy-circle", "robot-accuracy-circle-layer", robotCoordsRef.current);
      updateAccuracyCircle(map, "base-accuracy-circle", "base-accuracy-circle-layer", baseCoordsRef.current);
    };

    map.on("load", onLoad);

    // Ensure first paint uses the correct container size.
    const initialResizeRaf = requestAnimationFrame(() => map.resize());

    const onWindowResize = () => map.resize();
    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelAnimationFrame(initialResizeRaf);
      window.removeEventListener("resize", onWindowResize);
      map.off("zoom", onZoom);
      map.off("load", onLoad);
      // Clean up map instance
      if (map && typeof map.remove === "function") {
        map.remove();
      }
      mapRef.current = null;
      trailUpdaterRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource(TRAIL_SOURCE);
    if (!source || !trailUpdaterRef.current) return;
    const diff = trailUpdaterRef.current.update(trailPoints);
    if (diff.removeAll || diff.add?.length) source.updateData(diff);
  }, [trailPoints]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(IMPORTED_TRAIL_SOURCE);
    if (!source) return;
    source.setData(importedTrailGeoJSON(importedTrail?.points ?? []));
  }, [importedTrail]);

  useEffect(() => {
    trailControlRef.current?.update(trailPoints, trailReady, isRecording, hasUnsavedTrail, startRecording, stopRecording, clearTrail, importedTrail, importTrail, clearImportedTrail);
  }, [trailPoints, trailReady, isRecording, hasUnsavedTrail, startRecording, stopRecording, clearTrail, importedTrail, importTrail, clearImportedTrail]);

  useEffect(() => {
    if (webglSupported === false) return;
    if(robotMarker.current && baseMarker.current){
    if (robotMarker.current && baseMarker.current) {
      robotMarker.current.setLngLat([robotCoordinates.long, robotCoordinates.lat]);
      baseMarker.current.setLngLat([baseCoordinates.long, baseCoordinates.lat]);
    }

    if (mapRef.current) {
      updateAccuracyCircle(mapRef.current, "robot-accuracy-circle", "robot-accuracy-circle-layer", robotCoordinates);
      updateAccuracyCircle(mapRef.current, "base-accuracy-circle", "base-accuracy-circle-layer", baseCoordinates);
    }

    // console.log("robotCoordinates:", robotCoordinates);
    // console.log("baseCoordinates:", baseCoordinates);
    
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
        baseCoordinates.distanceMeters,
        baseCoordinates.headingDegrees,
      );
    }

    if(isLockedOn && !suppressTrackRef.current && mapRef.current) {
      if (!isCentered || !baseCoordinates.receive) {
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
  }, [robotCoordinates, baseCoordinates, isLockedOn, isCentered]);

  // Use full height so the map fills any explicit-height parent container
  if (webglSupported === false) {
  return (
    <div className="w-full flex-1 min-h-0 flex items-center justify-center border-2">
      <div>This map requires WebGL to work, which wasn't detected.</div>
    </div>
  )} else {
  return <div ref={mapContainer} className="w-full flex-1 min-h-0 bg-gray-200" />;
  }
}
