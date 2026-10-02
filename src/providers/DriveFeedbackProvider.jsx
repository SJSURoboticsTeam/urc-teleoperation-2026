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
  const [receive, setReceive] = useState(false);

  const staleTimeout = useRef(null);

  useEffect(() => {
    // One shared timer: any packet proves the rover is still talking.
    const markAlive = () => {
      setReceive(true);
      if (staleTimeout.current) {
        clearTimeout(staleTimeout.current);
      }
      staleTimeout.current = setTimeout(() => setReceive(false), STALE_AFTER_MS);
    };

    const handleWheelAngles = (data) => {
      setWheelAngles({
        frontLeft: data.fLAngle,
        frontRight: data.fRAngle,
        backLeft: data.bLAngle,
        backRight: data.bRAngle,
      });
      markAlive();
    };

    const handleDriveFeedback = (data) => {
      setMeasured({
        xVel: data.xVel,
        yVel: data.yVel,
        rotVel: data.rotVel,
      });
      if (data.commanded) {
        setReportedCommand({
          xVel: data.commanded.xVel,
          yVel: data.commanded.yVel,
          rotVel: data.commanded.rotVel,
        });
      }
      markAlive();
    };

    robotsocket.on("wheelAngles", handleWheelAngles);
    robotsocket.on("driveFeedback", handleDriveFeedback);

    // Same function references, or .off() removes nothing.
    return () => {
      robotsocket.off("wheelAngles", handleWheelAngles);
      robotsocket.off("driveFeedback", handleDriveFeedback);
      if (staleTimeout.current) {
        clearTimeout(staleTimeout.current);
      }
    };
  }, []);

  const value = {
    wheelAngles,
    measured,
    reportedCommand,
    receive,
  };

  return (
    <DriveFeedbackContext.Provider value={value}>
      {children}
    </DriveFeedbackContext.Provider>
  );
};

export default DriveFeedbackProvider;
