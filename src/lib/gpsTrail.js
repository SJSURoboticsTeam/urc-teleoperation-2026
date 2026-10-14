export const GPS_GAP_MS = 15_000;

// Build the trail from appended GPS points, resetting when the trail is cleared or replaced.
export function createTrailUpdater() {
    let processedCount = 0;
    let lastProcessedPoint = null;
    let previousCoordinates = null;
    let previousTime = null;

    return {
        update(points) {
            // Detect trail resets if new length is less than previously recorded length, or last point is not in expected position
            const reset = points.length < processedCount || (processedCount > 0 && points[processedCount - 1] !== lastProcessedPoint);
            if (reset) {
                processedCount = 0;
                previousCoordinates = null;
                previousTime = null;
            }

            // Build the trail from the appended points
            const features = [];
            for (let index = processedCount; index < points.length; index++) {
                const point = points[index];
                const time = Date.parse(point.timestamp);

                // Skip points with invalid timestamps
                if (Number.isNaN(time)) {
                    previousCoordinates = null;
                    previousTime = null;
                    continue;
                }

                // Add the point segment to the trail
                const coordinates = [point.longitude, point.latitude];
                features.push({
                    type: "Feature",
                    id: `point:${index}`,
                    properties: {},
                    geometry: { type: "Point", coordinates },
                });


                if (previousTime !== null && !point.segmentStart && time >= previousTime && time - previousTime <= GPS_GAP_MS) {
                    // Add the edge to the trail that connects the points
                    features.push({
                        type: "Feature",
                        id: `edge:${index}`,
                        properties: {},
                        geometry: { type: "LineString", coordinates: [previousCoordinates, coordinates] },
                    });
                }

                // Update the previous coordinates and time
                previousCoordinates = coordinates;
                previousTime = time;
            }

            // Update the processed count and last processed point
            processedCount = points.length;
            lastProcessedPoint = points[processedCount - 1] ?? null;

            // Return a property telling MapLibre to either remove the trail or add a new point
            return {
                ...(reset ? { removeAll: true } : {}),        
                ...(features.length > 0 ? { add: features } : {}),
            };
        }
    };
}

// Convert an array of GPS points to trail log for exporting
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
