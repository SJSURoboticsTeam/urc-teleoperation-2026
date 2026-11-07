import { isValidTrailPoint, startsNewTrailSegment } from "./gpsTrail.js";

const STORAGE_KEY = "missionControl.gpsTrail";

export function loadTrailPoints() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
        return [];
    }

    const points = JSON.parse(saved);
    if (!Array.isArray(points)) throw new Error("Invalid saved GPS trail");

    const validPoints = [];
    let nextPointStartsSegment = true;
    for (const point of points) {
        if (!isValidTrailPoint(point)) {
            nextPointStartsSegment = true;
            continue;
        }
        const previous = validPoints[validPoints.length - 1];
        const segmentStart = nextPointStartsSegment || startsNewTrailSegment(previous, point);
        validPoints.push({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: point.timestamp,
            ...(segmentStart ? { segmentStart: true } : {}),
        });
        nextPointStartsSegment = false;
    }
    return validPoints;
}

export function saveTrailPoints(points) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
}

export function clearStoredTrail() {
    localStorage.removeItem(STORAGE_KEY);
}
