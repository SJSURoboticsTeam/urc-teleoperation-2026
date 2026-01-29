import 'react-resizable/css/styles.css'
import { useRef, useState, useCallback, isValidElement } from 'react'
import CameraPane from '../components/cameras/CameraPane'

export default function DriveView({ CurrentView, showCameras}) {
  const containerRef = useRef(null)
  const [leftPct, setLeftPct] = useState(65)

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
        <CameraPane />
        <CameraPane />
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