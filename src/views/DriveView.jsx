import Wheel from "../components/ui/Wheel"
import Map from "../components/ui/Map"
import DriveManualInput from "../components/gamepad/DriveWidget"

export default function DriveComponents({sidewaysVelocity, forwardsVelocity, rotationalVelocity, moduleConflicts, panHeightVelocity, panWidthVelocity, leftPct}) {
  return(
        <div>
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
  )};