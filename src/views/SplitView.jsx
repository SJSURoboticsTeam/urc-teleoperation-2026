import 'react-resizable/css/styles.css' // Import default styles
import { useRef, useState, useCallback, isValidElement } from 'react'
import CameraPane from '../components/cameras/CameraPane'


export default function DriveView({CurrentView}) {
  const containerRef = useRef(null)
  const [leftPct, setLeftPct] = useState(65) // left pane width percentage

  const startDrag = useCallback((e) => {
    // Use pointer events so touch and mouse work
    const pointerId = e.pointerId
    const container = containerRef.current
    if (!container) return

    container.setPointerCapture && container.setPointerCapture(pointerId)

    const onPointerMove = (ev) => {
      const rect = container.getBoundingClientRect()
      const x = ev.clientX
      let pct = ((x - rect.left) / rect.width) * 100
      if (pct < 5) pct = 5
      if (pct > 95) pct = 95
      setLeftPct(pct)
    }

    const onPointerUp = () => {
      container.releasePointerCapture && container.releasePointerCapture(pointerId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }, [])

  return (
    // top-level flex row that fills available height
    <div ref={containerRef} className="flex flex-1 h-full min-h-0" style={{ userSelect: 'none' }}>
      {/* left pane: width controlled by leftPct */}
      <div className="flex flex-col gap-2 p-2 bg-gray-100 min-h-0" style={{ flex: `0 0 ${leftPct}%` }}>
        {isValidElement(CurrentView) ? (
          CurrentView
        ) : typeof CurrentView === 'function' ? (
          <CurrentView />
        ) : null}
        </div>




      {/* draggable divider: larger hit area with visible thin line */}
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startDrag}
        className="flex items-stretch justify-center"
        style={{ width: 24, cursor: 'col-resize', touchAction: 'none' }}
      >
        <div style={{ width: 3, background: 'rgba(156,163,175,1)', height: '100%' }} />
      </div>

      {/* right pane: takes remaining space */}
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        <CameraPane />
        <CameraPane />
      </div>
    </div>
  )
}
