export const GPS_GAP_MS = 10_000;

// Convert an array of GPS points to JSON
export function trailGeoJSON(points) {
    const features = [];
    let segment = [];
    let previousTime = null;

    const finish = () => {
        if (segment.length >= 2) {
            features.push({
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: segment },
            });
        }
        segment = [];
    };

    for (const point of points) {
        const time = Date.parse(point.timestamp);

        // If time is invalid, skip this point
        if (previousTime !== null && (point.segmentStart || time - previousTime > GPS_GAP_MS || time < previousTime)) {
            finish();
        }
        segment.push([point.longitude, point.latitude]);
        previousTime = time;
    }
    finish();

    return { type: "FeatureCollection", features };
}

// Convert an array of GPS points to trail log
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