import { createContext, useContext } from "react"

const armCommandContext = createContext(null)

// Import in App.jsx and wrap around components that need access to it
export function ArmCommandContext ({ armCommands, setArmCommands, children }) {
    return (
        <armCommandContext.Provider
            value={{ armCommands, setArmCommands }}
        >
            {children}
        </armCommandContext.Provider>
    )
}

// Import this to use and set arm commands
export function useArmCommands () {
    const { armCommands, setArmCommands } = useContext(armCommandContext)
    return [armCommands, setArmCommands]
}