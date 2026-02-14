import 'react-resizable/css/styles.css'
import { useRef, useState, useCallback, isValidElement, useEffect } from 'react'
import CameraPane from '../components/cameras/CameraPane'
import Button from '@mui/material/Button';

const DEFAULT_CAMERA = 'Standby'
const DEFAULT_CAMERA_NUM = 2
const STORAGE_KEY = 'missionControl.cameraViewConfigs'

export default function DriveView({ CurrentView, showCameras, viewKey = "default" }) {
  const containerRef = useRef(null)
  const [leftPct, setLeftPct] = useState(65)
  const [viewConfigs, setViewConfigs] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const startDrag = useCallback((e) => {
    const pointerId = e.pointerId
    const container = containerRef.current
    if (!container) return

    container.setPointerCapture?.(pointerId)

    const onPointerMove = (ev) => {
      const rect = container.getBoundingClientRect()
      let pct = ((ev.clientX - rect.left) / rect.width) * 100
      pct = Math.min(95, Math.max(5, pct))
      setLeftPct(pct)
    }

    const onPointerUp = () => {
      container.releasePointerCapture?.(pointerId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [])

  const effectiveLeftPct = (!showCameras) ? 100 : leftPct

  useEffect(() => {
    setViewConfigs((prev) => {
      if (prev[viewKey]) return prev
      return {
        ...prev,
        [viewKey]: {
          cameraNum: DEFAULT_CAMERA_NUM,
          cameraModes: Array(DEFAULT_CAMERA_NUM).fill(DEFAULT_CAMERA),
        },
      }
    })
  }, [viewKey])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewConfigs))
    } catch {
      // ignore errors
    }
  }, [viewConfigs])

  const activeConfig =
    viewConfigs[viewKey] ?? {
      cameraNum: DEFAULT_CAMERA_NUM,
      cameraModes: Array(DEFAULT_CAMERA_NUM).fill(DEFAULT_CAMERA),
    }
  const { cameraNum, cameraModes } = activeConfig

  const updateCameraNum = (nextNum) => {
    setViewConfigs((prev) => {
      const current =
        prev[viewKey] ?? {
          cameraNum: DEFAULT_CAMERA_NUM,
          cameraModes: Array(DEFAULT_CAMERA_NUM).fill(DEFAULT_CAMERA),
        }
      const cameraNum = Math.max(1, nextNum)
      let cameraModes = current.cameraModes.slice(0, cameraNum)
      if (cameraModes.length < cameraNum) {
        cameraModes = cameraModes.concat(
          Array(cameraNum - cameraModes.length).fill(DEFAULT_CAMERA)
        )
      }
      return { ...prev, [viewKey]: { cameraNum, cameraModes } }
    })
  }

  const updateCameraMode = (index, nextMode) => {
    setViewConfigs((prev) => {
      const current =
        prev[viewKey] ?? {
          cameraNum: DEFAULT_CAMERA_NUM,
          cameraModes: Array(DEFAULT_CAMERA_NUM).fill(DEFAULT_CAMERA),
        }
      const cameraModes = current.cameraModes.slice()
      cameraModes[index] = nextMode
      return { ...prev, [viewKey]: { ...current, cameraModes } }
    })
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 h-full min-h-0"
      style={{ userSelect: 'none' }}
    >
      {/* left pane */}
      <div
        className="flex flex-col gap-2 p-2 bg-gray-100 min-h-0"
        style={{ flex: `0 0 ${effectiveLeftPct}%` }}
      >
        {isValidElement(CurrentView)
          ? CurrentView
          : typeof CurrentView === 'function'
          ? <CurrentView />
          : null}
      </div>

      {/* divider (gone when cameras hidden) */}
      {showCameras && (
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={startDrag}
          className="flex items-stretch justify-center"
          style={{ width: 24, cursor: 'col-resize', touchAction: 'none' }}
        >
          <div
            style={{
              width: 3,
              background: 'rgba(156,163,175,1)',
              height: '100%',
            }}
          />
        </div>
      )}

      {/* right pane (still rendered, visually hidden) */}
      <div
        className="relative flex-1 flex flex-col gap-2 p-2 min-h-0"
        style={{
          display: (!showCameras) ? 'none' : 'flex',
        }}
      >
        <div>
          <Button onClick={() => updateCameraNum(cameraNum + 1)}>Add Camera</Button>
          <Button onClick={() => updateCameraNum(cameraNum - 1)}>Remove Camera</Button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-auto"
          style={
            cameraNum <= 3
              ? { display: 'flex', flexDirection: 'column', gap: '16px' }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
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

      {/* fullscreen click layer to restore cameras */}
      {(!showCameras) && (
        <div
          className="absolute inset-0 cursor-pointer"
          style={{ background: 'transparent' }}
        />
      )}
    </div>
  )
}