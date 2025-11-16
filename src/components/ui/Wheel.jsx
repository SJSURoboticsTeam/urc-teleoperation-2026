import "react-resizable/css/styles.css";
import { useEffect, useState} from "react";
import Box from "@mui/material/Box";
import { socket } from "../socket.io/socket";

export default function Wheel() {
  const [wheelAngles, setWheelAngles] = useState({
    frontLeft:0,
    frontRight:0,
    backLeft:0,
    backRight:0
  });

  socket.on("wheelAngles", (data) => {
    setWheelAngles({
      frontLeft: data.fLAngle,
      frontRight: data.fRAngle,
      backLeft: data.bLAngle,
      backRight: data.bRAngle,
    });
  });

  return (
    <Box width={150} height={175} display = 'flex' sx={{ m: 1.5 }} justifyContent= "center" >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-50 0 350 350"
        alignItems= "center"
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
        <svg viewBox = "1.24 1.92 52.53 146.87" x="0" y="0" width="52.53" height="146.87" style={{overflow: 'visible'}}> 
          <g id="Front_Left" transform={`rotate(${wheelAngles.frontLeft} 27.505 98.385)`}>
            {/* wheel rectangle */}
            <path d="M1.24 49.9h52.53v96.97H1.24z" className="wheel" />
            {/* vector */}
            <path
              id="Front_Left_Vector"
              d="M27.51 93.84V1.92"
              className="cls-2"
            />
        </g>
        </svg>
        <svg viewBox = ".5 146.87 52.53 311.56" x="0" y="146.87" width="52.53" height="311.56" style={{overflow: 'visible'}}> 
        <g id="Back_Left" transform={`rotate(${wheelAngles.backLeft} 26.76 316.11)`}>
          <path d="M.5 267.62h52.53v96.97H.5z" className="wheel" />
          <path
            id="Back_Left_Vector"
            d="M26.76 311.56v-91.92"
            className="cls-2"
          />
        </g>
        </svg>
        <svg viewBox = "177.25 146.87 229.78 311.56" x="177.25" y="146.87" width="229.78" height="311.56" style={{overflow: 'visible'}}> 
        <g id="Back_Right" transform={`rotate(${wheelAngles.backRight} 203.51 316.11)`}>
          <path d="M177.25 265.6h52.53v96.97h-52.53z" className="wheel" />
          <path
            id="Back_Right_Vector"
            d="M203.51 309.54v-91.92"
            className="cls-2"
          />
        </g>
        </svg>
        <svg viewBox = "177.25 1.92 229.78 146.87" x="177.25" y="0" width="229.78" height="146.87" style={{overflow: 'visible'}}> 
        <g id="Front_Right" transform={`rotate(${wheelAngles.frontRight} 203.51 98.385)`}>
          <path d="M175.55 47.98h52.53v96.97h-52.53z" className="wheel" />
          <path id="Front_Right_Vector" d="M201.82 91.92V0" className="cls-2" />
        </g>
        </svg>
      </svg>
        </Box>
  );
}
