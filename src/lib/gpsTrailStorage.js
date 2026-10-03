
const STORAGE_KEY = "missionControl.gpsTrail";

export function loadTrailPoints() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
        return [];
    }

    const points = JSON.parse(saved);
    
    return points.map((point) => {
        if (!point) throw new Error("Invalid saved GPS point");
        return { ...point, ...(point.segmentStart === true ? { segmentStart: true } : {})  }
    })

}

export function saveTrailPoints(points) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
}

export function clearStoredTrail() {
    localStorage.removeItem(STORAGE_KEY);
}
