import { useEffect, useRef, useState, useCallback } from "react";
import { useSnackbar } from "notistack";
import { robotsocket, basesocket } from "../components/socket.io/socket";
import { GPSContext } from "../contexts/GPSContext";
import { loadTrailPoints, saveTrailPoints, clearStoredTrail } from "../lib/gpsTrailStorage";
import { hasValidGPSCoordinates, isValidTrailPoint, startsNewTrailSegment } from "../lib/gpsTrail";
import { usePersistentState } from "../lib/usePersistentState";

const POIS_KEY = "missionControl.pois";
const NEXT_POI_NUMBER_KEY = "missionControl.nextPoiNumber";

// Ignore saved POIs that are missing fields or have invalid coordinates, e.g. from an older version
const isValidPois = (value) =>
    Array.isArray(value) &&
    value.every((poi) => typeof poi?.id === "string" && typeof poi.name === "string" &&
        hasValidGPSCoordinates({ latitude: poi.lat, longitude: poi.long }));
const isValidPoiNumber = (value) => Number.isInteger(value) && value >= 1;

export const GPSProvider = ({ children }) => {
    const { enqueueSnackbar } = useSnackbar();
    const robotLastSignalTime = useRef(Date.now()); 
    const baseLastSignalTime = useRef(Date.now()); 
    const robotSignalDiff = useRef();
    const baseSignalDiff = useRef();
    const robotSignalTimeout = useRef(null);
    const baseSignalTimeout = useRef(null);
    const trailRef = useRef([]);
    const trailReadyRef = useRef(false);
    const recordingRef = useRef(false);
    const nextPointStartsSegmentRef = useRef(true);
    const [trailPoints, setTrailPoints] = useState([]);
    const [trailReady, setTrailReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [hasUnsavedTrail, setHasUnsavedTrail] = useState(false);
    // Points of interest dropped on the map: { id, name, lat, long }. Saved so they survive reloads.
    const [pois, setPois] = usePersistentState(POIS_KEY, isValidPois, []);
    // Saved too, so numbers keep counting up across reloads instead of reusing a deleted POI's number
    const [nextPoiNumber, setNextPoiNumber] = usePersistentState(NEXT_POI_NUMBER_KEY, isValidPoiNumber, 1);

    const [robotCoordinates, setRobotCoordinates] = useState({
        long: -121.881194,
        lat: 37.336847,
        receive: false,
        accuracy_m: null,
    });

    const [baseCoordinates, setBaseCoordinates] = useState({
        long: -121.881194,
        lat: 37.336847,
        receive: false,
        distanceMeters: null,
        headingDegrees: null,
        accuracy_m: null,
    });

    useEffect(() => {
        trailReadyRef.current = false;
        try {
            trailRef.current = loadTrailPoints();
            setTrailPoints(trailRef.current);  
        } catch {
            // Ignore storage errors, use empty trail
        }
        trailReadyRef.current = true;
        setTrailReady(true)
      
        const robotHandler = (data) => {
            if (!isValidTrailPoint(data)) {
                if (recordingRef.current) nextPointStartsSegmentRef.current = true;
                return;
            }
            if (robotSignalTimeout.current) {
                clearTimeout(robotSignalTimeout.current);
            }

            const newTime = Date.now();
            robotSignalDiff.current = (newTime - robotLastSignalTime.current) / 1000;
            robotLastSignalTime.current = newTime;

            // console.log("Received GPS data:", data);
            setRobotCoordinates({
                long: data.longitude,
                lat: data.latitude,
                receive: true,
                accuracy_m: data.accuracy_m ?? null,
            });

            if (recordingRef.current) {
                const previous = trailRef.current[trailRef.current.length - 1];
                const startsSegment = nextPointStartsSegmentRef.current || startsNewTrailSegment(previous, data);
                const recordedPoint = startsSegment
                ? { ...data, segmentStart: true }
                : data;

                nextPointStartsSegmentRef.current = false;
                trailRef.current = [...trailRef.current, recordedPoint];
                setTrailPoints(trailRef.current);

                try {
                    saveTrailPoints(trailRef.current);
                    setHasUnsavedTrail(false);
                } catch {
                    // If localStorage fails, set unsaved trail state to warn the operator
                    setHasUnsavedTrail(true);
                }
            }

            robotSignalTimeout.current = setTimeout(() => {
                setRobotCoordinates((prev) => ({ ...prev, receive: false }));
            }, 3000);
        };

        const baseHandler = (data) => {
            if (!hasValidGPSCoordinates(data)) return;
            if (baseSignalTimeout.current) {
                clearTimeout(baseSignalTimeout.current);
            }

            const newTime = Date.now();
            baseSignalDiff.current = (newTime - baseLastSignalTime.current) / 1000;
            baseLastSignalTime.current = newTime;

            // console.log("Received GPS data:", data);
            setBaseCoordinates({
                long: data.longitude,
                lat: data.latitude,
                receive: true,
                distanceMeters: data.distanceMeters ?? null,
                headingDegrees: data.headingDegrees ?? null,
                accuracy_m: data.accuracy_m ?? null,
            });

            baseSignalTimeout.current = setTimeout(() => {
                setBaseCoordinates((prev) => ({ ...prev, receive: false }));
            }, 3000);
        };

        robotsocket.on("gpsData", robotHandler);
        basesocket.on("gpsData2", baseHandler);
        basesocket
        robotSignalTimeout.current = setTimeout(() => {
        setRobotCoordinates((prev) => ({ ...prev, receive: false }));
        }, 3000);
        baseSignalTimeout.current = setTimeout(() => {
        setBaseCoordinates((prev) => ({ ...prev, receive: false }));
        }, 3000);
        return () => {
            robotsocket.off("gpsData", robotHandler);
            basesocket.off("gpsData2", baseHandler);
            if (robotSignalTimeout.current) {
                clearTimeout(robotSignalTimeout.current);
            }
            if (baseSignalTimeout.current) {
                clearTimeout(baseSignalTimeout.current);
            }
        }
    }, []);

    const startRecording = useCallback(() => {
        if (!trailReadyRef.current || recordingRef.current) return;
        nextPointStartsSegmentRef.current = true;
        recordingRef.current = true;
        setIsRecording(true);
    }, []);

    const stopRecording = useCallback(() => {
        recordingRef.current = false;
        setIsRecording(false);
    }, []);

    const clearTrail = useCallback(() => {
        if (!trailReadyRef.current) return;
        try {
            clearStoredTrail();
        } catch {
            enqueueSnackbar("Could not clear the saved GPS trail. Your points are still available, export a log or try again.", {
                variant: "error",
                preventDuplicate: true,
            });
            return;
        }
        trailRef.current = [];
        nextPointStartsSegmentRef.current = true;
        setTrailPoints([]);
        setHasUnsavedTrail(false);
    }, [enqueueSnackbar]);

    // Numbers keep counting up after deletes so a new POI never reuses an old name
    const addPoi = useCallback(({ lat, long }) => {
        const number = nextPoiNumber;
        setNextPoiNumber(number + 1);
        const poi = { id: `poi-${Date.now()}-${number}`, name: `POI ${number}`, lat, long };
        setPois((prev) => [...prev, poi]);
        return poi;
    }, [nextPoiNumber, setNextPoiNumber, setPois]);

    const renamePoi = useCallback((id, name) => {
        setPois((prev) => prev.map((poi) => (poi.id === id ? { ...poi, name } : poi)));
    }, [setPois]);

    const removePoi = useCallback((id) => {
        setPois((prev) => prev.filter((poi) => poi.id !== id));
    }, [setPois]);

    // Swap in a whole set of POIs ({ name, lat, long }), e.g. from an imported map file or Clear Map.
    // The counter skips past imported "POI N" names so new pins don't duplicate them.
    const replacePois = useCallback((list) => {
        const importedNumbers = list.map((poi) => Number(/^POI (\d+)$/.exec(poi.name)?.[1] ?? 0));
        setNextPoiNumber((prev) => Math.max(prev, ...importedNumbers.map((number) => number + 1)));
        const now = Date.now();
        setPois(list.map((poi, index) => ({ id: `poi-${now}-import-${index}`, name: poi.name, lat: poi.lat, long: poi.long })));
    }, [setPois, setNextPoiNumber]);

    const value = {
        robotCoordinates,
        baseCoordinates,
        robotSignalDiff,
        baseSignalDiff,
        trailPoints,
        trailReady,
        isRecording,
        hasUnsavedTrail,
        startRecording,
        stopRecording,
        clearTrail,
        pois,
        addPoi,
        renamePoi,
        removePoi,
        replacePois,
    };

    return <GPSContext.Provider value={value}>{children}</GPSContext.Provider>;
};
export default GPSProvider;
