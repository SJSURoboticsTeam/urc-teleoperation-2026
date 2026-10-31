import { useState, useCallback } from "react";
import { WaypointsContext } from "../contexts/WaypointsContext";

// crypto.randomUUID only works on https/localhost, and the rover UI is served over plain http on the LAN
let nextWaypointNumber = 0;
const createWaypointId = () => `wp_${Date.now()}_${nextWaypointNumber++}`;

// A waypoint looks like:
// { id, name, type: "poi" | "science" | "autonomy", lat, long, accuracy_m, scienceSite: 1 | 2 | 3 | null, createdAt }
export const WaypointsProvider = ({ children }) => {
    const [waypoints, setWaypoints] = useState([]);

    const addWaypoint = useCallback((waypoint) => {
        const newWaypoint = {
            name: "Waypoint",
            type: "poi",
            accuracy_m: null,
            scienceSite: null,
            ...waypoint,
            id: createWaypointId(),
            createdAt: Date.now(),
        };
        setWaypoints((prev) => [...prev, newWaypoint]);
        return newWaypoint.id;
    }, []);

    const updateWaypoint = useCallback((id, changes) => {
        setWaypoints((prev) => prev.map((wp) => (wp.id === id ? { ...wp, ...changes, id } : wp)));
    }, []);

    const removeWaypoint = useCallback((id) => {
        setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
    }, []);

    // Only one waypoint can be each science site, so saving a site again moves the existing one
    const setScienceSite = useCallback((siteNumber, location) => {
        setWaypoints((prev) => {
            const existing = prev.find((wp) => wp.scienceSite === siteNumber);
            if (existing) {
                return prev.map((wp) => (wp.id === existing.id ? { ...wp, ...location, createdAt: Date.now() } : wp));
            }
            return [...prev, {
                id: createWaypointId(),
                name: `Science Site ${siteNumber}`,
                type: "science",
                accuracy_m: null,
                ...location,
                scienceSite: siteNumber,
                createdAt: Date.now(),
            }];
        });
    }, []);

    const value = {
        waypoints,
        addWaypoint,
        updateWaypoint,
        removeWaypoint,
        setScienceSite,
    };

    return <WaypointsContext.Provider value={value}>{children}</WaypointsContext.Provider>;
};
export default WaypointsProvider;
