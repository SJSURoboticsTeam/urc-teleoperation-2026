import { useState } from "react";
import { AutonomyLocationsContext, initialDriveState } from "../contexts/AutonomyLocationsContext";

// Owns the autonomy target locations so they survive switching panes and the map can show them
export const AutonomyLocationsProvider = ({ children }) => {
    const [driveData, setDriveData] = useState(initialDriveState);

    const value = {
        driveData,
        setDriveData,
    };

    return <AutonomyLocationsContext.Provider value={value}>{children}</AutonomyLocationsContext.Provider>;
};
export default AutonomyLocationsProvider;
