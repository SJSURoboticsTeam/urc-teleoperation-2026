import { useState, useEffect } from 'react'
import './App.css'
import { socket } from './socket'
import { ConnectionState } from './components/ConnectionState'
import { ConnectionManager } from './components/ConnectionManager'
import { Events } from './components/Events'  // used for logging actions/events from server/other clients

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected)

  useEffect(() => {
    function onConnect() {
      setIsConnected(true)
    }

    function onDisconnect() {
      setIsConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return (
    <div className="App">
      <ConnectionState isConnected={ isConnected } />
      <ConnectionManager />
    </div>
  )
}

export default App
