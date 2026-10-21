export const GPS_GAP_MS = 15_000;


export function hasValidGPSCoordinates(point) {
    return Number.isFinite(point?.latitude) && Math.abs(point.latitude) <= 90 &&
        Number.isFinite(point?.longitude) && Math.abs(point.longitude) <= 180;
}

// Validate a GPS recording point.
export function isValidTrailPoint(point) {
    return hasValidGPSCoordinates(point) &&
        typeof point.timestamp === "string" && !Number.isNaN(Date.parse(point.timestamp)) &&
        (point.segmentStart === undefined || typeof point.segmentStart === "boolean");
}

// Call after validating the points. Rendering handles backward time as a disconnected section.
export function startsNewTrailSegment(previous, point) {
    if (!previous || point.segmentStart === true) return true;
    const timeGap = Date.parse(point.timestamp) - Date.parse(previous.timestamp);
    return timeGap < 0 || timeGap > GPS_GAP_MS;
}

// Build the trail from appended GPS points, resetting when the trail is cleared or replaced.
export function createTrailUpdater() {
    let processedCount = 0;
    let lastProcessedPoint = null;
    let previousPoint = null;
    let interrupted = false;

    return {
        update(points) {
            // Detect trail resets if new length is less than previously recorded length, or last point is not in expected position.
            const reset = points.length < processedCount || (processedCount > 0 && points[processedCount - 1] !== lastProcessedPoint);
            if (reset) {
                processedCount = 0;
                previousPoint = null;
                interrupted = false;
            }

            // Build the trail from the appended points.
            const features = [];
            for (let index = processedCount; index < points.length; index++) {
                const point = points[index];
                // Keep the last valid location, but do not hide the rejected reading's interruption.
                if (!isValidTrailPoint(point)) {
                    interrupted = true;
                    continue;
                }
                const time = Date.parse(point.timestamp);

                // Add the point segment to the trail.
                const coordinates = [point.longitude, point.latitude];
                features.push({
                    type: "Feature",
                    id: `point:${index}`,
                    properties: previousPoint === null ? { start: true } : {},
                    geometry: { type: "Point", coordinates },
                });


                if (previousPoint !== null && time >= Date.parse(previousPoint.timestamp)) {
                    // A dotted connector shows an unrecorded interval, not the actual route traveled.
                    const gap = interrupted || startsNewTrailSegment(previousPoint, point);
                    features.push({
                        type: "Feature",
                        id: `edge:${index}`,
                        properties: { gap },
                        geometry: { type: "LineString", coordinates: [[previousPoint.longitude, previousPoint.latitude], coordinates] },
                    });
                }

                previousPoint = point;
                interrupted = false;
            }

            // Update the processed count and last processed point.
            processedCount = points.length;
            lastProcessedPoint = points[processedCount - 1] ?? null;

            // Return a property telling MapLibre to either remove the trail or add a new point.
            return {
                ...(reset ? { removeAll: true } : {}),
                ...(features.length > 0 ? { add: features } : {}),
            };
        }
    };
}

// Convert an array of GPS points to trail log for exporting.
export function serializeTrailLog(points) {
    const rows = [
        { type: "metadata", format: "urc-gps-trail", version: 1 },
        ...points.map((point, index) => ({
            type: "point",
            sequence: index + 1,
            timestamp: point.timestamp,
            latitude: point.latitude,
            longitude: point.longitude,
            ...(point.segmentStart ? { segmentStart: true } : {}),
        })),
    ];
    return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

// Read an exported new line-delimited log, validating its format and GPS points.
export function parseTrailLog(text) {
    const rows = [];

    // Split the text into lines using either macOS or Windows lines endings.
    for (const [index, line] of text.replace(/^\uFEFF/, "").split(/\r?\n/).entries()) {
        if (!line.trim()) continue;
        try {
            rows.push(JSON.parse(line));
        } catch {
            throw new Error(`Invalid JSON on line ${index + 1}.`);
        }
    }

    const metadata = rows[0];
    if (metadata?.type !== "metadata" || metadata.format !== "urc-gps-trail" || metadata.version !== 1) {
        throw new Error("Invalid GPS trail log version (needs to be version 1).");
    }
    if (rows.length === 1) {
      throw new Error("This log contains no trail points.");
    }

    return rows.slice(1).map((point, index) => {
        if (point?.type !== "point" || !isValidTrailPoint(point)) {
            throw new Error(`Invalid GPS data in point ${index + 1}.`);
        }
        return {
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp,
            ...(point.segmentStart === true ? { segmentStart: true } : {}),
        };
    });
}

// Build and return the imported trail as a GeoJSON FeatureCollection
export function importedTrailGeoJSON(points) {
    const features = createTrailUpdater().update(points).add ?? [];
    const pointFeatures = features.filter((feature) => feature.geometry.type === "Point");
    if (pointFeatures.length > 0) {
        pointFeatures[0].properties.start = true;
        pointFeatures[pointFeatures.length - 1].properties.end = true;
    }
    return { type: "FeatureCollection", features };
}
