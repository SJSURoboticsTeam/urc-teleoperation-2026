import { useEffect, useRef, useState, useCallback } from "react";
import { robotsocket, basesocket } from "../components/socket.io/socket";
import { GPSContext } from "../contexts/GPSContext";
import { loadTrailPoints, saveTrailPoints, clearStoredTrail } from "../lib/gpsTrailStorage";

export const GPSProvider = ({ children }) => {
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

    const [robotCoordinates, setRobotCoordinates] = useState({
        long: -121.881194,
        lat: 37.336847,
        receive: false,
    });

    const [baseCoordinates, setBaseCoordinates] = useState({
        long: -121.881194,
        lat: 37.336847,
        receive: false,
    });

    useEffect(() => {
        trailReadyRef.current = false;
        try {
            trailRef.current = loadTrailPoints();
            setTrailPoints(trailRef.current);  
        } catch {
            // ignore storage errors, use empty trail
        }
        trailReadyRef.current = true;
        setTrailReady(true)
      
        const robotHandler = (data) => {
            if (!data) return;
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
            });

            if (recordingRef.current) {
                const recordedPoint = nextPointStartsSegmentRef.current
                ? { ...data, segmentStart: true }
                : data;

                nextPointStartsSegmentRef.current = false;
                trailRef.current = [...trailRef.current, recordedPoint];
                setTrailPoints(trailRef.current);

                try {
                    saveTrailPoints(trailRef.current);
                } catch {
                    // ignore errors
                }
            }

            robotSignalTimeout.current = setTimeout(() => {
                setRobotCoordinates((prev) => ({ ...prev, receive: false }));
            }, 3000);
        };

        const baseHandler = (data) => {
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
        trailRef.current = [];
        nextPointStartsSegmentRef.current = true;
        setTrailPoints([]);
        clearStoredTrail();
    }, []);

    const value = {
        robotCoordinates,
        baseCoordinates,
        robotSignalDiff,
        baseSignalDiff,
        trailPoints,
        trailReady,
        isRecording,
        startRecording,
        stopRecording,
        clearTrail,
    };

    return <GPSContext.Provider value={value}>{children}</GPSContext.Provider>;
};
export default GPSProvider;