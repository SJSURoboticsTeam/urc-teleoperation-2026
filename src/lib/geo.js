const EARTH_RADIUS_M = 6_371_000;

const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const toRadians = (degrees) => degrees * Math.PI / 180;
const toDegrees = (radians) => radians * 180 / Math.PI;

// Return distance in meters and initial heading clockwise from north (0-360).
// Points use the { lat, long } shape from GPSProvider. Same math as calculate_distance_and_heading in base-pi/gps.py.
export function distanceAndHeading(start, end) {
    const startLat = toRadians(start.lat);
    const startLong = toRadians(start.long);
    const endLat = toRadians(end.lat);
    const endLong = toRadians(end.long);

    const latDelta = endLat - startLat;
    const longDelta = endLong - startLong;
    const haversine =
        Math.sin(latDelta / 2) ** 2 +
        Math.cos(startLat) * Math.cos(endLat) * Math.sin(longDelta / 2) ** 2;
    const distanceMeters = 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(haversine));

    const y = Math.sin(longDelta) * Math.cos(endLat);
    const x =
        Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(longDelta);
    const headingDegrees = (toDegrees(Math.atan2(y, x)) + 360) % 360;

    return { distanceMeters, headingDegrees };
}

// Nearest of the 8 compass points for a heading in degrees, e.g. 210 -> "SW"
export function compassDirection(headingDegrees) {
    return COMPASS_POINTS[Math.round(headingDegrees / 45) % 8];
}
