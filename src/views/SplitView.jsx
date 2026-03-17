import 'react-resizable/css/styles.css'
import { useRef, useState, useCallback, isValidElement, useEffect } from 'react'
import CameraPane from '../components/cameras/CameraPane'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'

const DEFAULT_CAMERA = 'Standby'
const DEFAULT_CAMERA_NUM = 2
const STORAGE_KEY = 'missionControl.cameraLayout'

export default function DriveView({ CurrentView, showCameras }) {
  const containerRef = useRef(null)
  const [leftPct, setLeftPct] = useState(65)
  const [cameraNum, setCameraNum] = useState(DEFAULT_CAMERA_NUM)
  const [cameraModes, setCameraModes] = useState(
    Array(DEFAULT_CAMERA_NUM).fill(DEFAULT_CAMERA)
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const nextNum = Math.max(1, parsed.cameraNum ?? DEFAULT_CAMERA_NUM)
        const nextModes = Array.isArray(parsed.cameraModes)
          ? parsed.cameraModes.slice(0, nextNum)
          : Array(nextNum).fill(DEFAULT_CAMERA)
        setCameraNum(nextNum)
        setCameraModes(
          nextModes.length < nextNum
            ? nextModes.concat(
                Array(nextNum - nextModes.length).fill(DEFAULT_CAMERA)
              )
            : nextModes
        )
      }
    } catch {
      // ignore storage errors
    }
    setHydrated(true)
  }, [])

  const startDrag = useCallback((e) => {
    const pointerId = e.pointerId;
    const container = containerRef.current;
    if (!container) return;

    container.setPointerCapture?.(pointerId);

    const onPointerMove = (ev) => {
      const rect = container.getBoundingClientRect();
      let pct = ((ev.clientX - rect.left) / rect.width) * 100;
      pct = Math.min(95, Math.max(5, pct));
      setLeftPct(pct);
    };

    const onPointerUp = () => {
      container.releasePointerCapture?.(pointerId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, []);

  const effectiveLeftPct = (!showCameras) ? 100 : leftPct

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cameraNum, cameraModes })
      )
    } catch {
      // ignore errors
    }
  }, [cameraNum, cameraModes, hydrated])

  const updateCameraNum = (nextNum) => {
    const nextCameraNum = Math.max(1, nextNum)
    setCameraNum(nextCameraNum)
    setCameraModes((prev) => {
      let nextModes = prev.slice(0, nextCameraNum)
      if (nextModes.length < nextCameraNum) {
        nextModes = nextModes.concat(
          Array(nextCameraNum - nextModes.length).fill(DEFAULT_CAMERA)
        )
      }
      return nextModes
    })
  }

  const updateCameraMode = (index, nextMode) => {
    setCameraModes((prev) => {
      const nextModes = prev.slice()
      nextModes[index] = nextMode
      return nextModes
    })
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 h-full min-h-0"
      style={{ userSelect: "none" }}
    >
      <div
        className="flex flex-col gap-2 p-2 bg-gray-100 min-h-0"
        style={{ flex: `0 0 ${effectiveLeftPct}%` }}
      >
        {isValidElement(CurrentView) ? (
          CurrentView
        ) : typeof CurrentView === "function" ? (
          <CurrentView />
        ) : null}
      </div>

      {showCameras && (
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={startDrag}
          className="flex items-stretch justify-center"
          style={{ width: 24, cursor: "col-resize", touchAction: "none" }}
        >
          <div
            style={{
              width: 3,
              background: "rgba(156,163,175,1)",
              height: "100%",
            }}
          />
        </div>
      )}

      <div
        className="flex-1 flex flex-col p-2 min-h-0"
        style={{
          display: (!showCameras) ? 'none' : 'flex',
        }}
      >
        
          
        <FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
          <InputLabel id="camera-count-label" sx={{ backgroundColor: 'white', px: 0.5 }}
          >Select Camera Count</InputLabel>
          <Select
            labelId="camera-count-label"
            value={cameraNum}
            label="Cameras"
            onChange={(e) => updateCameraNum(Number(e.target.value))}
          >
            <MenuItem value={1}>1 Camera</MenuItem>
            <MenuItem value={2}>2 Cameras</MenuItem>
            <MenuItem value={4}>4 Cameras</MenuItem>
          </Select>
        </FormControl>
        <div
          className="flex-1 min-h-0 overflow-auto"
          style={
            cameraNum <= 3
              ? { display: 'flex', flexDirection: 'column', gap: '8px' }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '8px',
                }
          }
        >
          {[...Array(cameraNum)].map((_, index) => (
            <div key={index} className="flex w-full h-full min-h-0">
              <CameraPane
                cameraValue={cameraModes[index] ?? DEFAULT_CAMERA}
                onCameraChange={(nextMode) => updateCameraMode(index, nextMode)}
              />
            </div>
          ))}
        </div>
        </div>

      {(!showCameras) && (
        <div
          className="absolute cursor-pointer"
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  );
}
