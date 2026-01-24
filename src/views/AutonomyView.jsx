import 'react-resizable/css/styles.css' // Import default styles
import { useRef} from 'react'
import Map from '../components/ui/Map'
import AutonomyControls from '../components/autonomy/AutonomyControls'

export default function AutonomyView() {
  const containerRef = useRef(null)
  return (
    // top-level flex row that fills available height
    <div ref={containerRef} className="flex flex-1 h-full min-h-0" style={{ userSelect: 'none' }}>
      {/* left pane: width controlled by leftPct */}
      {/* right pane: takes remaining space */}
      <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
        <AutonomyControls />
        <Map />
      </div>
    </div>
  )
}
