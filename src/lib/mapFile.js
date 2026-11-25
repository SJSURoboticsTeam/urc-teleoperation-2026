import { hasValidGPSCoordinates, isValidTrailPoint, parseJsonLines, parseTrailLog, readTrailPointRow, trailPointRow } from "./gpsTrail.js";

// A map file is newline-delimited JSON like the trail log: a metadata row, then one row per science site,
// autonomy location, POI, and trail point. One row per location keeps it easy to read or hand-write as a mission plan:
//   {"type":"metadata","format":"urc-map","version":1}
//   {"type":"scienceSite","site":1,"latitude":38.37,"longitude":-110.77}
//   {"type":"autonomyLocation","location":1,"label":"Post 1","lat":38.37,"lon":-110.77}
//   {"type":"poi","name":"Rock","latitude":38.37,"longitude":-110.77}
//   {"type":"point","sequence":1,"timestamp":"...","latitude":38.37,"longitude":-110.77}

// Target ids the rover uses for the two autonomy location cards; "location": N in a file is the Nth one
export const AUTONOMY_TARGET_IDS = ["Location 1", "Location 2"];

// Export the live trail plus every map location. targets are the rover's autonomy targets
// ({ id, label, latitude, longitude }, with null for a blank coordinate). Blank targets are left out.
export function serializeMapFile({ trailPoints, siteReadings, targets, pois }) {
    const rows = [
        { type: "metadata", format: "urc-map", version: 1 },
        ...siteReadings.flatMap((reading, index) => reading ? [{
            type: "scienceSite",
            site: index + 1,
            latitude: reading.lat,
            longitude: reading.long,
            ...(Number.isFinite(reading.accuracy_m) ? { accuracy_m: reading.accuracy_m } : {}),
        }] : []),
        ...AUTONOMY_TARGET_IDS.flatMap((id, index) => {
            const target = targets.find((t) => t.id === id);
            if (!target || (!target.label && target.latitude === null && target.longitude === null)) return [];
            return [{
                type: "autonomyLocation",
                location: index + 1,
                label: target.label,
                ...(target.latitude !== null ? { lat: target.latitude } : {}),
                ...(target.longitude !== null ? { lon: target.longitude } : {}),
            }];
        }),
        ...pois.map((poi) => ({ type: "poi", name: poi.name, latitude: poi.lat, longitude: poi.long })),
        ...trailPoints.map(trailPointRow),
    ];
    return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

// Older map files saved autonomy lat/lon as the text typed in the autonomy pane, and hand-written plans may
// use either, so accept a number or numeric text. Blank is null; anything else that isn't a number in range is rejected.
function readAutonomyCoordinate(value, limit, entry) {
    if (value === undefined || value === null || value === "") return null;
    const text = String(value).trim();
    const number = Number(text);
    if (text === "" || !Number.isFinite(number) || Math.abs(number) > limit) {
        throw new Error(`Entry ${entry}: autonomy coordinate "${value}" is not a valid number.`);
    }
    return number;
}

// Read a map file. Returns { trailPoints, locations }, where locations is null for an older trail-only
// log so importing one only shows its trail and leaves the map's locations alone.
// locations.targets only has the autonomy locations present in the file, in the rover's target shape.
// A "reached" field from an older file is ignored, since the rover now decides which targets it has reached.
export function parseMapFile(text) {
    const rows = parseJsonLines(text);
    const metadata = rows[0];

    if (metadata?.type === "metadata" && metadata.format === "urc-gps-trail") {
        return { trailPoints: parseTrailLog(text), locations: null };
    }
    if (metadata?.type !== "metadata" || metadata.format !== "urc-map" || metadata.version !== 1) {
        throw new Error("Not a map file (needs format urc-map version 1, or an older GPS trail log).");
    }

    const siteReadings = [null, null, null];
    const targets = [];
    const pois = [];
    const trailPoints = [];

    rows.slice(1).forEach((row, index) => {
        const entry = index + 1;
        const hasCoordinates = hasValidGPSCoordinates(row);

        if (row?.type === "scienceSite") {
            if (![1, 2, 3].includes(row.site) || !hasCoordinates) throw new Error(`Entry ${entry}: invalid science site.`);
            siteReadings[row.site - 1] = {
                lat: row.latitude,
                long: row.longitude,
                accuracy_m: Number.isFinite(row.accuracy_m) ? row.accuracy_m : null,
                capturedAt: Date.now(),
            };
        } else if (row?.type === "autonomyLocation") {
            if (![1, 2].includes(row.location)) throw new Error(`Entry ${entry}: autonomy location must be 1 or 2.`);
            const id = AUTONOMY_TARGET_IDS[row.location - 1];
            const target = {
                id,
                label: typeof row.label === "string" ? row.label : "",
                latitude: readAutonomyCoordinate(row.lat, 90, entry),
                longitude: readAutonomyCoordinate(row.lon, 180, entry),
            };
            // A repeated location replaces the earlier row, as it did before
            const existing = targets.findIndex((t) => t.id === id);
            if (existing === -1) targets.push(target);
            else targets[existing] = target;
        } else if (row?.type === "poi") {
            if (typeof row.name !== "string" || !row.name.trim() || !hasCoordinates) throw new Error(`Entry ${entry}: invalid POI.`);
            pois.push({ name: row.name.trim(), lat: row.latitude, long: row.longitude });
        } else if (row?.type === "point") {
            if (!isValidTrailPoint(row)) throw new Error(`Entry ${entry}: invalid trail point.`);
            trailPoints.push(readTrailPointRow(row));
        } else {
            throw new Error(`Entry ${entry}: unknown entry type "${row?.type}".`);
        }
    });

    if (rows.length === 1) throw new Error("This map file is empty.");

    return { trailPoints, locations: { siteReadings, targets, pois } };
}
