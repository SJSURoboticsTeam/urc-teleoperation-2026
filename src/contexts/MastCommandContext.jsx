import { createContext, useContext } from "react"

const mastCommandContext = createContext(null)

// Import in App.jsx and wrap around components that need access to it
export default function MastCommandContext ({ mastCommands, setMastCommands, children }) {
    return (
        <mastCommandContext.Provider
            value={{ mastCommands, setMastCommands }}
        >
            {children}
        </mastCommandContext.Provider>
    )
}

// Import this to use and set mast commands
export function useMastCommands () {
    // pan, tilt, speed
    const { mastCommands, setMastCommands } = useContext(mastCommandContext)
    return [mastCommands, setMastCommands]
}