import { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu';
import NavConnectionStatus from './BackendConnectionManager';
import GamepadPanel from './GamepadPanel';
import { orange } from '@mui/material/colors';

export default function TopAppBar({ setCurrentView, onVelocitiesChange, onArmVelocitiesChange, currentView }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [driveGamepads, setDriveGamepads] = useState({});
  const [armGamepads, setArmGamepads] = useState({});

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleViewChange = (view) => setCurrentView(view);

  useEffect(() => {
    const handleConnect = (e) => {
      const gp = e.gamepad;
      if (/STANDARD/i.test(gp.id)) {
        setDriveGamepads((prev) => ({ ...prev, [gp.index]: gp }));
      } else if (/EXTREME/i.test(gp.id)) {
        setArmGamepads((prev) => ({ ...prev, [gp.index]: gp }));
      }
    };

    const handleDisconnect = (e) => {
      setDriveGamepads((prev) => {
        const copy = { ...prev };
        delete copy[e.gamepad.index];
        return copy;
      });
      setArmGamepads((prev)=> {
        const copy={...prev};
        delete copy[e.gamepad.index];
        return copy;
      })
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    return () => {
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, []);

  return (
    <>
    {/*sx={{ bgcolor: orange[800] }} */}
      <AppBar 
        sx={{
    bgcolor: (import.meta.env.MODE === "production" || import.meta.env.MODE === "prod")
      ? orange[800]
      : undefined,
  }}
        >
      <Toolbar>
          <IconButton
            edge='start'
            color='inherit'
            aria-label='menu'
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          {/* sx: hide "Teleoperations" title on phones in portrait mode so menubar fits */}
          <Typography variant='h6' component='div' sx={{ display: { xs: 'none', sm: 'none',  md: 'block' } }}>
            Teleoperations
          </Typography>

          {/* Buttons to change between views */}
          <Button
            color='inherit'
            onClick={() => handleViewChange('DriveView')}
          >
            Drive View
          </Button>
          <Button
            color='inherit'
            onClick={() => handleViewChange('ArmView')}
          >
            Arm View
          </Button>
          <Button
            color='inherit'
            onClick={() => handleViewChange('ScienceView')}
          >
            Science View
          </Button>
          <Button
            color='inherit'
            onClick={() => handleViewChange('AutonomyView')}
          >
            Autonomy View
          </Button>
          <Button
            color='inherit'
            onClick={() => handleViewChange('MapView')}
          >
            Map View
          </Button>

          {  (import.meta.env.MODE === "production" || import.meta.env.MODE === "prod") && <Button
            color='inherit'
            onClick={() => handleViewChange('RecordingsView')}
          >
            RECORDINGS
          </Button>  }

          { (import.meta.env.MODE === "production" || import.meta.env.MODE === "prod") && <Button
            color='inherit'
            onClick={() => handleViewChange('SpeedTestView')}
          >
            SPEEDTEST
          </Button> }
          

          { /* fill the space between the buttons and the connection status */ }
          <div style={{ flexGrow: 1 }} />

          <GamepadPanel name="Drive" onDriveVelocitiesChange={onVelocitiesChange} driveGamepads={driveGamepads} armGamepads={armGamepads} onArmVelocitiesChange={onArmVelocitiesChange} currentView={currentView}/>
          

          <NavConnectionStatus />
        </Toolbar>
      </AppBar>
      {/* Drawer for side panel comopnents */}
      <Drawer anchor='left' open={drawerOpen} onClose={toggleDrawer(false)} sx={{
        '& .MuiDrawer-paper': {
            width: 240,
          },
      }}>
        <List>
          <ListItem disablePadding>
            <Typography>
              Side bar placeholder
            </Typography>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
