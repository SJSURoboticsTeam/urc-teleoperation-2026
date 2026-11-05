import { useState } from "react";
import { ScienceContext } from "../contexts/ScienceContext";

// Owns the science site locations so they survive switching panes and the map can show them.
// siteReadings[0..2] are Sites 1-3: { lat, long, accuracy_m, capturedAt } or null if not captured yet.
export const ScienceProvider = ({ children }) => {
    const [siteReadings, setSiteReadings] = useState([null, null, null]);

    const value = {
        siteReadings,
        setSiteReadings,
    };

    return <ScienceContext.Provider value={value}>{children}</ScienceContext.Provider>;
};
export default ScienceProvider;
