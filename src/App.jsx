// React imports
import { useState, useEffect } from 'react'
// MUI components
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'

// Local imports
import './App.css'
import TopAppBar from './components/TopAppBar'
import DriveView from './views/DriveView'
import ArmView from './views/ArmView'
import SpeedTestView from './views/SpeedTestView'
import ScienceView from './views/ScienceView'
import AutonomyView from './views/AutonomyView'


function App() {
  
  const [currentView, setCurrentView] = useState('DriveView')


  // Select which view we want to display
  function renderView() {
    switch (currentView) {
      case 'DriveView':
        return <DriveView />
      case 'ArmView':
        return <ArmView />
      case 'SpeedTestView':
        return <SpeedTestView />
      case 'ScienceView':
        return <ScienceView />
      case 'AutonomyView':
        return <AutonomyView />
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
      {renderView()}
    </Box>
  )
}

export default App
