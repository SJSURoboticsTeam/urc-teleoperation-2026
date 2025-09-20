// React imports
import { useState, useEffect } from 'react'
// MUI components
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'

// Local imports
import './App.css'
import TopAppBar from './components/TopAppBar'
import DriveView from './panes/drive/DriveView'
import ArmView from './panes/ArmView'

// Socket io
import { socket } from './socket'
import { Events } from './components/Events'  // used for logging actions/events from server/other clients

function App() {
  
  const [currentView, setCurrentView] = useState('DriveView')


  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case 'DriveView':
        return <DriveView />
      case 'ArmView':
        return <ArmView />
      default:
        return <div>Select a view</div>
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      <CssBaseline /> {/* Normalizes styles */}
      <div>easter egg :))</div>
      {/* Drawer and Switch views */}
      <TopAppBar setCurrentView={setCurrentView}></TopAppBar>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {renderView()}
      </Box>
    </Box>
  )
}

export default App
