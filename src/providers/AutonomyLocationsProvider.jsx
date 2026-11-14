import { AutonomyLocationsContext, initialDriveState } from "../contexts/AutonomyLocationsContext";
import { usePersistentState } from "../lib/usePersistentState";

const AUTONOMY_LOCATIONS_KEY = "missionControl.autonomyLocations";

// Ignore saved data that doesn't match the location card fields, e.g. from an older version
const isValidDriveData = (value) =>
    ["location1", "location2"].every((key) => {
        const location = value?.[key];
        return typeof location?.label === "string" && typeof location.lat === "string" &&
            typeof location.lon === "string" && typeof location.reached === "boolean";
    });

// Owns the autonomy target locations so they survive switching panes and reloads, and the map can show them
export const AutonomyLocationsProvider = ({ children }) => {
    const [driveData, setDriveData] = usePersistentState(AUTONOMY_LOCATIONS_KEY, isValidDriveData, initialDriveState);

    const value = {
        driveData,
        setDriveData,
    };

    return <AutonomyLocationsContext.Provider value={value}>{children}</AutonomyLocationsContext.Provider>;
};
export default AutonomyLocationsProvider;
