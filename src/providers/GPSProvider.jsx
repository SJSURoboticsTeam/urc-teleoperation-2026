import { useEffect, useRef, useState } from "react";
import { robotsocket, basesocket } from "../components/socket.io/socket";
import { GPSContext } from "../contexts/GPSContext";

export const GPSProvider = ({ children }) => {
    const robotLastSignalTime = useRef(Date.now()); 
    const baseLastSignalTime = useRef(Date.now()); 
    const robotSignalDiff = useRef();
    const baseSignalDiff = useRef();
    const robotSignalTimeout = useRef(null);
    const baseSignalTimeout = useRef(null);

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
    });


    useEffect(() => {
        const robotHandler = (data) => {
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
                accuracy_m: data.accuracy_m ?? null
            });

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

    const value = {
    robotCoordinates,
    baseCoordinates,
    robotSignalDiff,
    baseSignalDiff,
    };

    return <GPSContext.Provider value={value}>{children}</GPSContext.Provider>;
};
export default GPSProvider;