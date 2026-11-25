import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";

// Read a saved value, falling back when nothing is saved, storage is blocked, or the saved data is invalid
function loadSaved(key, isValid, fallback) {
    try {
        const saved = localStorage.getItem(key);
        if (saved === null) return fallback;
        const value = JSON.parse(saved);
        return isValid(value) ? value : fallback;
    } catch {
        return fallback;
    }
}

// useState that survives page reloads by mirroring the value into localStorage.
// isValid guards against corrupted or outdated saved data; a failed save warns the operator instead of throwing.
export function usePersistentState(key, isValid, fallback) {
    const { enqueueSnackbar } = useSnackbar();
    const [value, setValue] = useState(() => loadSaved(key, isValid, fallback));

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            enqueueSnackbar("Map locations could not be saved in this browser and will be lost on reload.", {
                variant: "warning",
                preventDuplicate: true,
            });
        }
    }, [key, value, enqueueSnackbar]);

    return [value, setValue];
}
