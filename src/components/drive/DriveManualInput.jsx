import "react-resizable/css/styles.css"; // Import default styles
import { useEffect } from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { socket } from "../../socket";
import Button from "@mui/material/Button";
import Gamepad from "./Gamepad";
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

export default function DriveManualInput() {
  const [sidewaysVelocity, setSidewaysVelocity] = useState("0");
  const [forwardsVelocity, setForwardVelocity] = useState("0");
  const [rotationalVelocity, setRotationalVelocity] = useState("0");

  const [gamepads,setGamepads]=useState({})
    const [controllerno,setControllerno]=useState(0)
    const gamepadHandler = (event, connected) => {
        const gamepad = event.gamepad;
        const regex=new RegExp('STANDARD','i');
        if (connected) {
        if (regex.test(gamepad.id))
        setGamepads({...gamepads,[gamepad.index]:gamepad});
        } else {
        setGamepads((prev) => {
          const copy = { ...prev };
          delete copy[gamepad.index];
          return copy;
        });
        alert("you disconnected controller index "+gamepad.index);
        }
    };
    useEffect(()=>{
        if (controllerno>0)
        alert("Number of controllers currently connected:"+ controllerno);
    },[controllerno])
    useEffect(() => {
        const handleConnect = (e) => {
        setControllerno(prev => {return prev + 1;});
        gamepadHandler(e, true);
        };
    const handleDisconnect = (e) => {
        setControllerno(prev => {Math.max(prev - 1, 0)});
        gamepadHandler(e, false);
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
    }, []);   

  // Sends drive commands to server
  useEffect(() => {
    let driveCommands = {
      xVel: sidewaysVelocity,
      yVel: forwardsVelocity,
      rotVel: rotationalVelocity,
    };
    socket.emit("driveCommands", driveCommands);
  }, [sidewaysVelocity, forwardsVelocity, rotationalVelocity]);

  const handleClick = (event) => {
    socket.emit("driveHoming");
  };
  const velocities = [
    { id: sidewaysVelocity, name: "Sideways Velocity" },
    { id: forwardsVelocity, name: "Forward Velocity" },
    { id: rotationalVelocity, name: "Rotational Velocity" },
  ];
  return (
    <Box sx={{display:'flex',flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
      <Button onClick={handleClick}>Homing</Button>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          marginTop: 2,
        }}
      >
        {velocities.map((velocity) => (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              alignItems: "center",
              border: "2px solid #000000",
              width: "75px",
              height: "50px",
              borderRadius: 2,
              marginTop: 5,
            }}
          >
            <Typography variant="body1" sx={{ marginTop: 10 }}>
              {velocity.id}
            </Typography>
            <Typography variant="body2" sx={{ marginTop: 5 }}>
              {velocity.name}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box
      sx={{
        marginTop:10,
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center'
        }}
      >
      <SportsEsportsIcon sx={{color:gamepads.length>0?green[500]:"black", width:100,height:100}} id="gamepadicon"/> 
      <Gamepad onVelocitiesChange={(vel)=>{
                setForwardVelocity(vel.ly.toPrecision(2));
                setRotationalVelocity(vel.rx.toPrecision(2));
                setSidewaysVelocity(vel.lx.toPrecision(2));
      }} gamepads={gamepads}></Gamepad>
      </Box>
    </Box>
  );
}
