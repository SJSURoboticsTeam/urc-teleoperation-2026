import { useEffect, useRef, useState } from "react";
import { robotsocket } from "../components/socket.io/socket";
import { DriveFeedbackContext } from "../contexts/DriveFeedbackContext";

// How long to wait after the last packet before calling the feed dead.
// Matches the GPS provider's behaviour.
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

// What the backend last sent to the rover. Normally this mirrors the local
// gamepad state, but it is the only source when nothing is plugged in.
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
    // Any feedback packet proves the rover is still talking, so one shared
    // timer covers both events. Restarting it on every packet means it only
    // fires once the rover genuinely goes quiet.
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

    // Same function references on the way out, so StrictMode's double-invoke
    // removes the listeners it added instead of leaving one behind.
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
