import Wheel from "../components/ui/Wheel"
import Map from "../components/ui/Map"
import DriveManualInput from "../components/gamepad/DriveWidget"
import { useRef} from 'react'

export default function DriveComponents({sidewaysVelocity, forwardsVelocity, rotationalVelocity, moduleConflicts, panHeightVelocity, panWidthVelocity, leftPct}) {
    const containerRef = useRef(null)
    return (
      // top-level flex row that fills available height
      <div ref={containerRef} className="flex flex-1 h-full min-h-0" style={{ userSelect: 'none' }}>
        <div className="flex-1 flex flex-col gap-2 p-2 min-h-0">
            <div className="flex flex-row items-center justify-center gap-6">
              <DriveManualInput sidewaysVelocity={sidewaysVelocity}
                      forwardsVelocity={forwardsVelocity}
                      rotationalVelocity={rotationalVelocity}
                      moduleConflicts={moduleConflicts}
                      panHeightVelocity={panHeightVelocity}
                      panWidthVelocity={panWidthVelocity}/>
            <Wheel />
            </div>
            <Map/>
        </div>
      </div>
    )
  }
