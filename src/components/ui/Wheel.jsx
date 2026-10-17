import "react-resizable/css/styles.css";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useDriveFeedback } from "../../contexts/DriveFeedbackContext";

// SVG silently drops an invalid transform, which looks identical to 0 degrees.
function drawAngle(value) {
  return Number.isFinite(value) ? value : 0;
}

function hasAngle(value) {
  return Number.isFinite(value);
}

// Feedback arrives at 5Hz, so a 200ms tween exactly bridges one frame to the
// next and the wheels sweep instead of stepping. Linear, not ease, or each
// frame would visibly accelerate and brake.
const SWEEP = { transition: "transform 200ms linear" };
const SWEEP_D = { transition: "d 200ms linear" };
// Honour the OS "reduce motion" setting: the wheels still update, they just
// jump straight to the new value instead of sweeping.
const NO_MOTION = { transition: "none" };

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false,
  );

  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query) return;

    const onChange = (event) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

// The direction vector also doubles as a speed gauge: short stub when stopped,
// full length at speed. Both maxima are 4 because Gamepad.jsx scales all three
// axes - including rotation - by the drive speed slider, which tops out at 4.
const MAX_TRANSLATION = 4.0;   // m/s
const MAX_ROTATION = 4.0;      // deg/s, same slider
// Each vector starts 43.94 below its wheel rectangle's top edge, so anything
// shorter than that is swallowed by the wheel and the direction cue is lost.
// Floor it just past that; the top end is a little beyond the original 92.
const VECTOR_MIN = 52;
const VECTOR_MAX = 104;

// Per-wheel speed is not reported - only chassis velocity - so all four
// vectors share one magnitude taken from whichever of translation or rotation
// is further along its range.
function speedFactor(measured) {
  const translation = Math.hypot(measured.xVel ?? 0, measured.yVel ?? 0);
  const rotation = Math.abs(measured.rotVel ?? 0);
  const t = Math.min(1, translation / MAX_TRANSLATION);
  const r = Math.min(1, rotation / MAX_ROTATION);
  return Number.isFinite(Math.max(t, r)) ? Math.max(t, r) : 0;
}

// Each vector starts at a point and runs "up" the wheel in local coords.
function vectorPath(x, y, length) {
  return `M${x} ${y}v-${length.toFixed(2)}`;
}

export default function Wheel() {
    const { wheelAngles, measured, receive } = useDriveFeedback();
  const reducedMotion = usePrefersReducedMotion();
  const sweep = reducedMotion ? NO_MOTION : SWEEP;
  const sweepD = reducedMotion ? NO_MOTION : SWEEP_D;

  // 0 degrees is a real angle, so an unheard-from corner must not render as one.
  const known = {
    frontLeft: hasAngle(wheelAngles.frontLeft),
    frontRight: hasAngle(wheelAngles.frontRight),
    backLeft: hasAngle(wheelAngles.backLeft),
    backRight: hasAngle(wheelAngles.backRight),
  };
  const anyKnown = Object.values(known).some(Boolean);

  // Shared by all four vectors.
  const vectorLength =
    VECTOR_MIN + speedFactor(measured) * (VECTOR_MAX - VECTOR_MIN);

  return (
    <Box
      height={175}
      display="flex"
      flexDirection="column"
      alignItems="center"
      sx={{
        width: "clamp(120px, 10vw, 150px)",
        m: "clamp(4px, 0.8vw, 12px)",
        position: "relative",
      }}
      justifyContent="center"
    >
      {(!receive || !anyKnown) && (
        <Typography
          variant="caption"
          color="error"
          sx={{ fontWeight: 700, letterSpacing: "0.04em" }}
        >
          NO DATA
        </Typography>
      )}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        viewBox="-50 0 350 350"
      >
        <defs>
          <style>
            {
              ".wheel,.cls-2{fill:#8bd3da;stroke-miterlimit:10}.wheel{stroke:#231f20}.cls-2{stroke:#2e59a8;stroke-width:2px}"
            }
          </style>
        </defs>
        <rect
          id="Chassis"
          width={176.77}
          height={239.39}
          x={26.5}
          y={79.19}
          rx={30.93}
          ry={30.93}
          style={{
            fill: "#fff",
            stroke: "#231f20",
            strokeMiterlimit: 10,
          }}
        />
        <svg
          viewBox="1.24 1.92 52.53 146.87"
          x="0"
          y="0"
          width="52.53"
          height="146.87"
          style={{ overflow: "visible" }}
        >
          <g
            id="Front_Left"
            opacity={known.frontLeft ? 1 : 0.25}
            style={sweep}
            transform={`rotate(${drawAngle(wheelAngles.frontLeft)} 27.505 98.385)`}
          >
            {/* wheel rectangle */}
            <path d="M1.24 49.9h52.53v96.97H1.24z" className="wheel" />
            {/* vector */}
            <path
              id="Front_Left_Vector"
              style={sweepD}
              d={vectorPath(27.51, 93.84, vectorLength)}
              className="cls-2"
            />
          </g>
        </svg>
        <svg
          viewBox=".5 146.87 52.53 311.56"
          x="0"
          y="146.87"
          width="52.53"
          height="311.56"
          style={{ overflow: "visible" }}
        >
          <g
            id="Back_Left"
            opacity={known.backLeft ? 1 : 0.25}
            style={sweep}
            transform={`rotate(${drawAngle(wheelAngles.backLeft)} 26.76 316.11)`}
          >
            <path d="M.5 267.62h52.53v96.97H.5z" className="wheel" />
            <path
              id="Back_Left_Vector"
              style={sweepD}
              d={vectorPath(26.76, 311.56, vectorLength)}
              className="cls-2"
            />
          </g>
        </svg>
        <svg
          viewBox="177.25 146.87 229.78 311.56"
          x="177.25"
          y="146.87"
          width="229.78"
          height="311.56"
          style={{ overflow: "visible" }}
        >
          <g
            id="Back_Right"
            opacity={known.backRight ? 1 : 0.25}
            style={sweep}
            transform={`rotate(${drawAngle(wheelAngles.backRight)} 203.51 316.11)`}
          >
            <path d="M177.25 265.6h52.53v96.97h-52.53z" className="wheel" />
            <path
              id="Back_Right_Vector"
              style={sweepD}
              d={vectorPath(203.51, 309.54, vectorLength)}
              className="cls-2"
            />
          </g>
        </svg>
        <svg
          viewBox="177.25 1.92 229.78 146.87"
          x="177.25"
          y="0"
          width="229.78"
          height="146.87"
          style={{ overflow: "visible" }}
        >
          <g
            id="Front_Right"
            opacity={known.frontRight ? 1 : 0.25}
            style={sweep}
            transform={`rotate(${drawAngle(wheelAngles.frontRight)} 203.51 98.385)`}
          >
            <path d="M175.55 47.98h52.53v96.97h-52.53z" className="wheel" />
            <path
              id="Front_Right_Vector"
              style={sweepD}
              d={vectorPath(201.82, 91.92, vectorLength)}
              className="cls-2"
            />
          </g>
        </svg>
      </svg>
    </Box>
  );
}
