import { hasValidGPSCoordinates, isValidTrailPoint, parseJsonLines, parseTrailLog, readTrailPointRow, trailPointRow } from "./gpsTrail.js";

// A map file is newline-delimited JSON like the trail log: a metadata row, then one row per science site,
// autonomy location, POI, and trail point. One row per location keeps it easy to read or hand-write as a mission plan:
//   {"type":"metadata","format":"urc-map","version":1}
//   {"type":"scienceSite","site":1,"latitude":38.37,"longitude":-110.77}
//   {"type":"autonomyLocation","location":1,"label":"Post 1","lat":"38.37","lon":"-110.77","reached":false}
//   {"type":"poi","name":"Rock","latitude":38.37,"longitude":-110.77}
//   {"type":"point","sequence":1,"timestamp":"...","latitude":38.37,"longitude":-110.77}

const AUTONOMY_KEYS = ["location1", "location2"];

// Export the live trail plus every map location. Blank autonomy cards are left out.
export function serializeMapFile({ trailPoints, siteReadings, driveData, pois }) {
    const rows = [
        { type: "metadata", format: "urc-map", version: 1 },
        ...siteReadings.flatMap((reading, index) => reading ? [{
            type: "scienceSite",
            site: index + 1,
            latitude: reading.lat,
            longitude: reading.long,
            ...(Number.isFinite(reading.accuracy_m) ? { accuracy_m: reading.accuracy_m } : {}),
        }] : []),
        ...AUTONOMY_KEYS.flatMap((key, index) => {
            const { label, lat, lon, reached } = driveData[key];
            if (!label && !lat && !lon && !reached) return [];
            return [{ type: "autonomyLocation", location: index + 1, label, lat, lon, reached }];
        }),
        ...pois.map((poi) => ({ type: "poi", name: poi.name, latitude: poi.lat, longitude: poi.long })),
        ...trailPoints.map(trailPointRow),
    ];
    return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

// Autonomy lat/lon are kept as the text shown in the autonomy pane. Hand-written plans may use numbers,
// so accept either, but reject anything that isn't blank or a number in range.
function readAutonomyCoordinate(value, limit, entry) {
    if (value === undefined || value === "") return "";
    const text = String(value).trim();
    const number = Number(text);
    if (text === "" || !Number.isFinite(number) || Math.abs(number) > limit) {
        throw new Error(`Entry ${entry}: autonomy coordinate "${value}" is not a valid number.`);
    }
    return text;
}

// Read a map file. Returns { trailPoints, locations }, where locations is null for an older trail-only
// log so importing one only shows its trail and leaves the map's locations alone.
// locations.driveData only has the autonomy locations present in the file; the caller fills in the rest.
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
    const driveData = {};
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
            driveData[AUTONOMY_KEYS[row.location - 1]] = {
                label: typeof row.label === "string" ? row.label : "",
                lat: readAutonomyCoordinate(row.lat, 90, entry),
                lon: readAutonomyCoordinate(row.lon, 180, entry),
                reached: row.reached === true,
            };
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

    return { trailPoints, locations: { siteReadings, driveData, pois } };
}
