import 'react-resizable/css/styles.css' // Import default styles
import DriveManualInput from '../components/drive/DriveManualInput'
import CameraPane from '../components/drive/CameraPane'
import Map from '../components/drive/Map'
import Wheel from '../components/drive/Wheel'

//import '../components/drive/drive.css'

export default function DriveView() {
  return (
    <div className="container flex">
      <div className="flex-1 bg-gray-100"></div>
      <div className="flex-1">
        <DriveManualInput />
      </div>
      <div className="flex-1"> 
        <Map />
      </div>
      <div className="flex-1">
        <Wheel />
      </div>
      {/* divider */}
      <div className="w-1 bg-gray-400"></div>
      <div className="flex-1"> 
        <CameraPane />
        <CameraPane />
      </div>
      <div className="flex-1 bg-gray-100"></div>
    </div>
  )
}
