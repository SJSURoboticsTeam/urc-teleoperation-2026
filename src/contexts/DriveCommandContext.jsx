import { createContext, useContext } from "react"

const driveCommandContext = createContext(null)

// Import in App.jsx and wrap around components that need access to it
export default function DriveCommandContext ({ driveCommands, setDriveCommands, children }) {
    return (
        <driveCommandContext.Provider
            value={{ driveCommands, setDriveCommands }}
        >
            {children}
        </driveCommandContext.Provider>
    )
}

// Import this to use and set drive commands
export function useDriveCommands () {
    // lx, ly, rx, moduleConflicts
    const { driveCommands, setDriveCommands } = useContext(driveCommandContext)
    return [driveCommands, setDriveCommands]
}