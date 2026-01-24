

export default function DriveComponents({sidewaysVelocity, forwardsVelocity, rotationalVelocity, moduleConflicts, panHeightVelocity, panWidthVelocity}) {
  return(
            <div className="flex flex-row items-center justify-center gap-6">
          <DriveManualInput sidewaysVelocity={sidewaysVelocity}
                  forwardsVelocity={forwardsVelocity}
                  rotationalVelocity={rotationalVelocity}
                  moduleConflicts={moduleConflicts}
                  panHeightVelocity={panHeightVelocity}
                  panWidthVelocity={panWidthVelocity}/>
          <Wheel />
          <Map />
        </div>
  )};