import { ScienceContext } from "../contexts/ScienceContext";
import { usePersistentState } from "../lib/usePersistentState";
import { hasValidGPSCoordinates } from "../lib/gpsTrail";

const SCIENCE_SITES_KEY = "missionControl.scienceSites";

// Ignore saved data that isn't 3 sites of null or valid coordinates, e.g. from an older version
const isValidSiteReadings = (value) =>
    Array.isArray(value) && value.length === 3 &&
    value.every((reading) => reading === null || hasValidGPSCoordinates({ latitude: reading.lat, longitude: reading.long }));

// Owns the science site locations so they survive switching panes and reloads, and the map can show them.
// siteReadings[0..2] are Sites 1-3: { lat, long, accuracy_m, capturedAt } or null if not captured yet.
export const ScienceProvider = ({ children }) => {
    const [siteReadings, setSiteReadings] = usePersistentState(SCIENCE_SITES_KEY, isValidSiteReadings, [null, null, null]);

    const value = {
        siteReadings,
        setSiteReadings,
    };

    return <ScienceContext.Provider value={value}>{children}</ScienceContext.Provider>;
};
export default ScienceProvider;
