import { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button'
import MenuIcon from '@mui/icons-material/Menu';
import NavConnectionStatus from './ConnectionManager';

export default function TopAppBar({ setCurrentView }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  return (
    <>
      <AppBar position='fixed'>
        <Toolbar>
          <IconButton
            edge='start'
            color='inherit'
            aria-label='menu'
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant='h6' component='div' sx={{ display: { xs: 'none', sm: 'block' } }}>
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
          { /* fill the space between the buttons and the connection status */ }
          <div style={{ flexGrow: 1 }} />
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