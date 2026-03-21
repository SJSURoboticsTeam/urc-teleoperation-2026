import { createContext, useContext } from "react"

const gamepadContext = createContext(null)

// Import in App.jsx and wrap around components that need access to it
export default function GamepadContext ({ connectedGamepads, setConnectedGamepads, children }) {
    return (
        <gamepadContext.Provider
            value={{ connectedGamepads, setConnectedGamepads }}
        >
            {children}
        </gamepadContext.Provider>
    )
}

// Import this to use and set connected gamepads
export function useConnectedGamepads () {
    const { connectedGamepads, setConnectedGamepads } = useContext(gamepadContext)
    return [connectedGamepads, setConnectedGamepads]
}