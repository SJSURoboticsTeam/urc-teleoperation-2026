import { useEffect, useRef, useState } from "react";
import { robotsocket } from "../components/socket.io/socket";
import { DriveFeedbackContext } from "../contexts/DriveFeedbackContext";

// Matches the GPS provider's staleness window.
const STALE_AFTER_MS = 3000;

const NO_ANGLES = {
  frontLeft: null,
  frontRight: null,
  backLeft: null,
  backRight: null,
};

const NO_VELOCITIES = {
  xVel: null,
  yVel: null,
  rotVel: null,
};

// The backend's view of the last command, used when no gamepad is attached.
const NO_COMMANDED = {
  xVel: null,
  yVel: null,
  rotVel: null,
};

export const DriveFeedbackProvider = ({ children }) => {
  const [wheelAngles, setWheelAngles] = useState(NO_ANGLES);
  const [measured, setMeasured] = useState(NO_VELOCITIES);
  const [reportedCommand, setReportedCommand] = useState(NO_COMMANDED);
  // false until the rover actually tells us something
  // Tracked per event. The two arrive from different firmware replies, so one
  // can dry up while the other keeps flowing - a shared flag would report the
  // whole feed healthy on the strength of the half that still works.
  const [anglesFresh, setAnglesFresh] = useState(false);
  const [velocitiesFresh, setVelocitiesFresh] = useState(false);

  const anglesTimeout = useRef(null);
  const velocitiesTimeout = useRef(null);

  useEffect(() => {
    // Restart that event's own countdown; it only fires if packets stop.
    const keepAlive = (ref, setFresh) => {
      setFresh(true);
      if (ref.current) {
        clearTimeout(ref.current);
      }
      ref.current = setTimeout(() => setFresh(false), STALE_AFTER_MS);
    };

    const handleWheelAngles = (data) => {
      setWheelAngles({
        frontLeft: data.fLAngle,
        frontRight: data.fRAngle,
        backLeft: data.bLAngle,
        backRight: data.bRAngle,
      });
      keepAlive(anglesTimeout, setAnglesFresh);
    };

    const handleDriveFeedback = (data) => {
      setMeasured({
        xVel: data.xVel,
        yVel: data.yVel,
        rotVel: data.rotVel,
      });
      if (data.commanded) setReportedCommand(data.commanded);
      keepAlive(velocitiesTimeout, setVelocitiesFresh);
    };

    robotsocket.on("wheelAngles", handleWheelAngles);
    robotsocket.on("driveFeedback", handleDriveFeedback);

    // Same function references, or .off() removes nothing.
    return () => {
      robotsocket.off("wheelAngles", handleWheelAngles);
      robotsocket.off("driveFeedback", handleDriveFeedback);
      if (anglesTimeout.current) {
        clearTimeout(anglesTimeout.current);
      }
      if (velocitiesTimeout.current) {
        clearTimeout(velocitiesTimeout.current);
      }
    };
  }, []);

  const value = {
    wheelAngles,
    measured,
    reportedCommand,
    anglesFresh,
    velocitiesFresh,
  };

  return (
    <DriveFeedbackContext.Provider value={value}>
      {children}
    </DriveFeedbackContext.Provider>
  );
};

export default DriveFeedbackProvider;
