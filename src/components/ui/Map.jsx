import React, {useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo} from "react";
import ReactDOM from "react-dom/client";
import { createPortal } from "react-dom";
import { useSnackbar } from "notistack";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button, Box, Typography, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import ScienceIcon from "@mui/icons-material/Science";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PlaceIcon from "@mui/icons-material/Place";
import { useGPS } from "../../contexts/GPSContext";
import { useScience } from "../../contexts/ScienceContext";
import { useAutonomyLocations, initialDriveState } from "../../contexts/AutonomyLocationsContext";
import { useAutonomyMode } from "../../contexts/AutonomyModeContext";
import { useSoftStop } from "../../contexts/SoftStopContext";
import WaypointPopup from "./WaypointPopup";
import { createTrailUpdater, importedTrailGeoJSON, hasValidGPSCoordinates } from "../../lib/gpsTrail";
import { serializeMapFile, parseMapFile } from "../../lib/mapFile";

const TRAIL_SOURCE = "rover-gps-trail";
const IMPORTED_TRAIL_SOURCE = "imported-gps-trail";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Works for the map's locations and for an imported file's (whose driveData may only have some locations)
function countLocations({ siteReadings, driveData, pois }) {
  return {
    sites: siteReadings.filter(Boolean).length,
    targets: Object.values(driveData).filter((location) => location.label || location.lat || location.lon || location.reached).length,
    pois: pois.length,
  };
}

const describeCounts = ({ sites, targets, pois }) =>
  `${plural(sites, "science site")}, ${plural(targets, "autonomy target")}, and ${plural(pois, "POI")}`;

function TrailControlUI({ points, ready, recording, hasUnsavedTrail, onStart, onStop, onClear, importedTrail, onClearImport, mapData, locationsLocked, onImportMap, onClearMap }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmClearMap, setConfirmClearMap] = useState(false);
  // A parsed file waiting for the operator to confirm the import
  const [pendingImport, setPendingImport] = useState(null);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef(null);
  const mapCounts = countLocations(mapData);
  const hasLocations = mapCounts.sites + mapCounts.targets + mapCounts.pois > 0;

  const importMapFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    setIsImporting(true);
    try {
      setPendingImport({ name: file.name, ...parseMapFile(await file.text()) });
    } catch (error) {
      setImportError(error.message || "Could not read this map file.");
    } finally {
      setIsImporting(false);
    }
  };

  const exportMap = () => {
    const blob = new Blob([serializeMapFile({ trailPoints: points, ...mapData })], { type: "application/x-ndjson;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // File name of the map file is a timestamp of when it was downloaded
    link.download = `rover-map-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
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
          Trail changes could not be saved. Export Map before reloading or closing this page.
        </Typography>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        <Button size="small" variant="contained" disabled={!ready || recording} onClick={onStart}>Start Recording</Button>
        <Button size="small" variant="outlined" disabled={!recording} onClick={onStop}>Stop Recording</Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        <Button size="small" variant="outlined" disabled={!ready || (points.length === 0 && !hasLocations)} onClick={exportMap}>Export Map</Button>
        <Button size="small" color="error" variant="outlined" disabled={!ready || points.length === 0} onClick={() => setConfirmClear(true)}>Clear Trail</Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        <Button size="small" variant="outlined" disabled={!ready || isImporting || locationsLocked} onClick={() => importInputRef.current?.click()}>
          {isImporting ? "Importing…" : "Import Map"}
        </Button>
        <Button size="small" variant="outlined" disabled={!importedTrail} onClick={onClearImport}>Clear Import</Button>
      </Box>
      <Button size="small" color="error" variant="outlined" fullWidth sx={{ mt: 0.5 }} disabled={!hasLocations || locationsLocked} onClick={() => setConfirmClearMap(true)}>
        Clear Map
      </Button>
      {locationsLocked && (
        <Typography variant="caption" color="error.main">Import and Clear Map are locked while autonomy or Soft Stop is active.</Typography>
      )}
      <input ref={importInputRef} type="file" accept=".log" aria-label="Import map file" hidden onChange={importMapFile} />
      {importError && <Typography role="alert" variant="body2" color="error.main">{importError}</Typography>}
      <Dialog open={!!pendingImport} onClose={() => setPendingImport(null)}>
        <DialogTitle>Import {pendingImport?.name}?</DialogTitle>
        <DialogContent>
          {pendingImport?.locations
            ? `This replaces the map's ${describeCounts(mapCounts)} with the file's ${describeCounts(countLocations(pendingImport.locations))}.`
            : "This is an older trail-only log, so the map's locations stay as they are."}
          {pendingImport?.trailPoints.length > 0 &&
            ` Its trail (${plural(pendingImport.trailPoints.length, "point")}) is shown as an imported trail; your recorded trail is not changed.`}
          {locationsLocked && <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>Locked while autonomy or Soft Stop is active.</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingImport(null)}>Cancel</Button>
          {/* The lock can turn on while the dialog is open (e.g. Soft Stop from another client) or while the file is read */}
          <Button disabled={locationsLocked} onClick={() => { onImportMap(pendingImport); setPendingImport(null); }}>
            {pendingImport?.locations ? "Replace" : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmClearMap} onClose={() => setConfirmClearMap(false)}>
        <DialogTitle>Clear map locations?</DialogTitle>
        <DialogContent>
          This removes {describeCounts(mapCounts)} from the map and this browser. The GPS trail is not affected. Export the map first if you want to keep them.
          {locationsLocked && <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>Locked while autonomy or Soft Stop is active.</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearMap(false)}>Cancel</Button>
          <Button color="error" disabled={locationsLocked} onClick={() => { onClearMap(); setConfirmClearMap(false); }}>Clear Map</Button>
        </DialogActions>
      </Dialog>
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
  // Takes the TrailControlUI props as one object; there are too many to pass by position
  update(props) {
    this._root?.render(<TrailControlUI {...props} />);
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
        // One row so the panel stays short and the coordinate boxes below don't cover it
        flexDirection: "row",
        gap: 0.5,
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

function PoiControlUI({ isPlacing, canPinRover, onTogglePlacing, onPinRover }) {
  return (
    <Box
      sx={{
        display: "flex",
        // Buttons in one row, like Reset Zoom; the placing hint wraps onto its own line
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 0.5,
        maxWidth: 220,
        bgcolor: "rgba(255,255,255,0.9)",
        p: 1,
        borderRadius: 1,
        border: "1px solid black",
        minWidth: 100,
      }}
    >
      <Button size="small" variant={isPlacing ? "contained" : "outlined"} onClick={onTogglePlacing}>
        {isPlacing ? "Cancel" : "+ Add POI"}
      </Button>
      <Button size="small" variant="outlined" disabled={!canPinRover} onClick={onPinRover}>Pin Rover</Button>
      {isPlacing && <Typography variant="caption" sx={{ flexBasis: "100%" }}>Click the map to drop a pin</Typography>}
    </Box>
  );
}

class PoiControl {
  constructor(onTogglePlacing, onPinRover) {
    this._onTogglePlacing = onTogglePlacing;
    this._onPinRover = onPinRover;
    this._root = null;
  }
  onAdd(map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl my-custom-control";
    this._root = ReactDOM.createRoot(this._container);
    this.update(false, false);
    return this._container;
  }
  update(isPlacing, canPinRover) {
    if(!this._root) {
      return;
    }
    this._root.render(
      <PoiControlUI
        isPlacing = {isPlacing}
        canPinRover = {canPinRover}
        onTogglePlacing = {this._onTogglePlacing}
        onPinRover = {this._onPinRover}
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

const WAYPOINT_STYLES = {
  science: { color: "#00897b", Icon: ScienceIcon },
  autonomy: { color: "#3949ab", Icon: SmartToyIcon },
  poi: { color: "#455a64", Icon: PlaceIcon },
};

// Science pins are larger and ringed in yellow so they stand out from other waypoints
function WaypointPin({ waypoint }) {
  const { color, Icon } = WAYPOINT_STYLES[waypoint.type] ?? WAYPOINT_STYLES.poi;
  const highlighted = waypoint.type === "science";
  const size = highlighted ? 34 : 26;
  const label = waypoint.name;

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: highlighted ? "3px solid #ffd600" : "2px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
        cursor: "pointer",
      }}
    >
      <Icon sx={{ fontSize: size * 0.6 }} />
      {/* Label hangs below the icon so the icon's center stays on the coordinate */}
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          mt: 0.25,
          px: 0.5,
          bgcolor: "rgba(255,255,255,0.9)",
          color: "#000",
          borderRadius: 0.5,
          fontWeight: highlighted ? 700 : 400,
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// Autonomy coordinates are typed text, so skip blank or half-typed values instead of pinning 0,0
function parseCoordinate(text) {
  return text.trim() === "" ? NaN : Number(text);
}

// Each pane owns its locations; the map only gathers them into one list of pins
function buildWaypoints(siteReadings, driveData, pois) {
  const waypoints = [];

  siteReadings.forEach((reading, index) => {
    if (!reading) return;
    waypoints.push({ id: `science-${index + 1}`, type: "science", name: `Site ${index + 1}`, scienceSite: index + 1, lat: reading.lat, long: reading.long });
  });

  ["location1", "location2"].forEach((key, index) => {
    const location = driveData[key];
    const lat = parseCoordinate(location.lat);
    const long = parseCoordinate(location.lon);
    if (!hasValidGPSCoordinates({ latitude: lat, longitude: long })) return;
    const name = location.label.trim() || `Location ${index + 1}`;
    waypoints.push({ id: `autonomy-${key}`, type: "autonomy", name, autonomyKey: key, lat, long });
  });

  pois.forEach((poi) => {
    waypoints.push({ id: poi.id, type: "poi", name: poi.name, lat: poi.lat, long: poi.long });
  });

  return waypoints;
}

function removeWaypointMarker({ marker, root }) {
  marker.remove();
  // Unmounting a root while React is committing logs a warning, so wait a tick
  setTimeout(() => root.unmount());
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
  const poiControlRef = useRef(null);
  const poiStateRef = useRef(null);
  const suppressTrackRef = useRef(false);

  const trailControlRef = useRef(null);
  const trailPointsRef = useRef([]);
  const trailControlPropsRef = useRef(null);
  const trailUpdaterRef = useRef(null);
  // Waypoint id -> { marker, root }. A plain object because this component's name hides the built-in Map
  const waypointMarkersRef = useRef({});

  const [isLockedOn, setIsLockedOn] = useState(true);
  const [isCentered, setIsCentered] = useState(false);
  const [webglSupported, setWebglSupported] = useState(null);
  const [importedTrail, setImportedTrail] = useState(null);
  const clearImportedTrail = useCallback(() => setImportedTrail(null), []);

  const { robotCoordinates, baseCoordinates, robotSignalDiff, baseSignalDiff, trailPoints, trailReady, isRecording, hasUnsavedTrail, startRecording, stopRecording, clearTrail, pois, addPoi, renamePoi, removePoi, replacePois } = useGPS();
  const { siteReadings, setSiteReadings } = useScience();
  const { driveData, setDriveData } = useAutonomyLocations();
  // Memoized so GPS updates re-rendering the map don't redraw every pin
  const waypoints = useMemo(() => buildWaypoints(siteReadings, driveData, pois), [siteReadings, driveData, pois]);
  // While true, the next click on the map drops a POI there
  const [isPlacingPoi, setIsPlacingPoi] = useState(false);

  // The pin whose popup is open: { id, node } where node is the popup's DOM content
  const [openPopup, setOpenPopup] = useState(null);
  const openWaypoint = waypoints.find((wp) => wp.id === openPopup?.id);
  const { autonomyEnabled } = useAutonomyMode();
  const { softStopActive } = useSoftStop();
  const { enqueueSnackbar } = useSnackbar();
  // Same lock as the science pane's GET GNSS button
  const scienceLocked = autonomyEnabled || softStopActive;

  // The popup opens empty and its content renders right after, so re-place it once the content is in.
  // MapLibre picks above/below the pin from the popup's size; without this it measures an empty popup and gets clipped.
  useLayoutEffect(() => {
    if (!openPopup) return;
    const marker = waypointMarkersRef.current[openPopup.id]?.marker;
    marker?.getPopup()?.setLngLat(marker.getLngLat());
  }, [openPopup, openWaypoint]);

  // Science and POI pins move into the site, so they don't leave a duplicate pin stacked on the same spot.
  // A science pin keeps its GPS accuracy. Autonomy pins only copy, since they are separate autonomy targets.
  const setScienceSiteFromWaypoint = (site) => {
    if (scienceLocked || !openWaypoint) return;
    const movingFrom = openWaypoint.scienceSite;
    setSiteReadings((prev) => {
      const next = [...prev];
      next[site - 1] = movingFrom
        ? prev[movingFrom - 1]
        : { lat: openWaypoint.lat, long: openWaypoint.long, accuracy_m: null, capturedAt: Date.now() };
      if (movingFrom) next[movingFrom - 1] = null;
      return next;
    });
    if (openWaypoint.type === "poi") removePoi(openWaypoint.id);
    const moved = movingFrom ? `Site ${movingFrom}` : openWaypoint.type === "poi" ? openWaypoint.name : null;
    enqueueSnackbar(moved ? `${moved} moved to Site ${site}` : `Site ${site} set to ${openWaypoint.name}'s location`, { variant: "success" });
  };

  // Delete from the popup: a POI is removed; a science site or autonomy location is emptied in its own pane
  const deleteWaypoint = () => {
    if (!openWaypoint) return;
    if (openWaypoint.type === "poi") {
      removePoi(openWaypoint.id);
    } else if (openWaypoint.type === "science") {
      if (scienceLocked) return;
      setSiteReadings((prev) => prev.map((reading, index) => (index === openWaypoint.scienceSite - 1 ? null : reading)));
    } else {
      setDriveData((prev) => ({ ...prev, [openWaypoint.autonomyKey]: initialDriveState[openWaypoint.autonomyKey] }));
    }
    enqueueSnackbar(`${openWaypoint.name} deleted`, { variant: "success" });
  };
  // Replace the map's locations with an imported file's. The file's trail is shown as the imported trail;
  // the recorded trail is never touched.
  const importMap = useCallback(({ name, trailPoints: importedPoints, locations }) => {
    setImportedTrail(importedPoints.length > 0 ? { name, points: importedPoints } : null);
    // Older trail-only logs have no locations, so the map's stay as they are
    if (locations) {
      setSiteReadings(locations.siteReadings);
      setDriveData({ ...initialDriveState, ...locations.driveData });
      replacePois(locations.pois);
    }
    enqueueSnackbar(`Imported ${name}`, { variant: "success" });
  }, [setSiteReadings, setDriveData, replacePois, enqueueSnackbar]);

  // Remove all science sites, autonomy targets, and POIs, e.g. before a new mission. The trail has its own Clear Trail.
  const clearMap = useCallback(() => {
    setSiteReadings([null, null, null]);
    setDriveData(initialDriveState);
    replacePois([]);
  }, [setSiteReadings, setDriveData, replacePois]);

  const trailControlProps = useMemo(() => ({
    points: trailPoints,
    ready: trailReady,
    recording: isRecording,
    hasUnsavedTrail,
    onStart: startRecording,
    onStop: stopRecording,
    onClear: clearTrail,
    importedTrail,
    onClearImport: clearImportedTrail,
    mapData: { siteReadings, driveData, pois },
    // Import and Clear Map change science sites, so they follow the same lock
    locationsLocked: scienceLocked,
    onImportMap: importMap,
    onClearMap: clearMap,
  }), [trailPoints, trailReady, isRecording, hasUnsavedTrail, startRecording, stopRecording, clearTrail, importedTrail, clearImportedTrail, siteReadings, driveData, pois, scienceLocked, importMap, clearMap]);

  trailPointsRef.current = trailPoints;
  trailControlPropsRef.current = trailControlProps;
  // Read by the map click handler and POI control, which are created once when the map loads
  poiStateRef.current = { isPlacingPoi, addPoi, enqueueSnackbar };

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

    const poiControl = new PoiControl(
      () => setIsPlacingPoi((prev) => !prev),
      () => {
        // Works after the signal drops too, using the last known position (e.g. to mark where the connection was lost)
        const robot = robotCoordsRef.current;
        if (!robot.hasFix) return;
        const poi = poiStateRef.current.addPoi({ lat: robot.lat, long: robot.long });
        poiStateRef.current.enqueueSnackbar(
          robot.receive ? `${poi.name} pinned at the rover` : `${poi.name} pinned at the rover's last known position (no GPS signal)`,
          { variant: robot.receive ? "success" : "warning" },
        );
      }
    );

    const onMapClick = (e) => {
      if (!poiStateRef.current.isPlacingPoi) return;
      // Clicks on a pin or popup open/use that popup instead of dropping a new pin
      if (e.originalEvent.target.closest?.(".maplibregl-marker, .maplibregl-popup")) return;
      const poi = poiStateRef.current.addPoi({ lat: e.lngLat.lat, long: e.lngLat.lng });
      setIsPlacingPoi(false);
      poiStateRef.current.enqueueSnackbar(`${poi.name} added`, { variant: "success" });
    };
    map.on("click", onMapClick);

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

      map.addControl(poiControl, "top-left");
      poiControlRef.current = poiControl;
      poiControl.update(poiStateRef.current.isPlacingPoi, robotCoordsRef.current.hasFix);

      const trailControl = new TrailControl();
      map.addControl(trailControl, "bottom-right");
      trailControlRef.current = trailControl;
      trailControl.update(trailControlPropsRef.current);

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
        data: importedTrailGeoJSON(trailControlPropsRef.current.importedTrail?.points ?? []),
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
      map.off("click", onMapClick);
      Object.values(waypointMarkersRef.current).forEach(removeWaypointMarker);
      waypointMarkersRef.current = {};
      // Clean up map instance
      if (map && typeof map.remove === "function") {
        map.remove();
      }
      mapRef.current = null;
      trailUpdaterRef.current = null;
    };
  }, []);

  useEffect(() => {
    poiControlRef.current?.update(isPlacingPoi, robotCoordinates.hasFix);
    // Crosshair cursor shows the next map click will drop a pin
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = isPlacingPoi ? "crosshair" : "";
  }, [isPlacingPoi, robotCoordinates.hasFix]);

  // Keep one marker per waypoint: add new ones, move or restyle changed ones, remove deleted ones.
  // Must stay after the map setup effect so mapRef is ready on the first run.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = waypointMarkersRef.current;
    const currentIds = new Set(waypoints.map((wp) => wp.id));

    for (const id of Object.keys(markers)) {
      if (!currentIds.has(id)) {
        removeWaypointMarker(markers[id]);
        delete markers[id];
      }
    }

    for (const wp of waypoints) {
      if (!markers[wp.id]) {
        const element = document.createElement("div");
        // The popup's content is rendered into popupNode with a portal below, so it stays in this React tree
        const popupNode = document.createElement("div");
        // waypoint-popup (index.css) gives it the same border and rounded corners as the app's dropdowns
        const popup = new maplibregl.Popup({ offset: 20, maxWidth: "300px", className: "waypoint-popup" }).setDOMContent(popupNode);
        popup.on("open", () => {
          // Map controls (GPS trail, coordinates) sit at z-index 2; keep the open popup above them
          popup.getElement().style.zIndex = 3;
          setOpenPopup({ id: wp.id, node: popupNode });
        });
        // Opening another pin can close this one after the new one opens, so only clear if this pin is still the open one
        popup.on("close", () => setOpenPopup((prev) => (prev?.id === wp.id ? null : prev)));
        markers[wp.id] = {
          // MapLibre needs a position before addTo
          marker: new maplibregl.Marker({ element }).setLngLat([wp.long, wp.lat]).setPopup(popup).addTo(map),
          root: ReactDOM.createRoot(element),
        };
      }
      const { marker, root } = markers[wp.id];
      marker.setLngLat([wp.long, wp.lat]);
      marker.getElement().title = `${wp.name}\n${wp.lat.toFixed(6)}, ${wp.long.toFixed(6)}`;
      // Keep highlighted science pins on top of overlapping waypoints
      marker.getElement().style.zIndex = wp.type === "science" ? 1 : "";
      root.render(<WaypointPin waypoint={wp} />);
    }
  }, [waypoints]);

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
    trailControlRef.current?.update(trailControlProps);
  }, [trailControlProps]);

  useEffect(() => {
    if (webglSupported === false) return;
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
  return (
    <>
      <div ref={mapContainer} className="w-full flex-1 min-h-0 bg-gray-200" />
      {openWaypoint && createPortal(
        <WaypointPopup
          key={openWaypoint.id}
          waypoint={openWaypoint}
          waypoints={waypoints}
          robotCoordinates={robotCoordinates}
          baseCoordinates={baseCoordinates}
          scienceLocked={scienceLocked}
          onSetScienceSite={setScienceSiteFromWaypoint}
          onRenamePoi={(name) => renamePoi(openWaypoint.id, name)}
          onDelete={deleteWaypoint}
        />,
        openPopup.node,
      )}
    </>
  );
  }
}
