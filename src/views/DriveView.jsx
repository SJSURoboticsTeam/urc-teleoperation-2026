import 'react-resizable/css/styles.css' // Import default styles
import DriveManualInput from '../components/drive/DriveManualInput'
import CameraPane from '../components/drive/CameraPane'
import Map from '../components/drive/Map'
import Wheel from '../components/drive/Wheel'

//import '../components/drive/drive.css'

export default function DriveView (){
    return (
        <div className = "container">
            <div className = "item1">
                <DriveManualInput />
            </div>
            <div className = "item2"> 
                <Map />
            </div>
            <div className = "item3"> 
                <CameraPane />
                <CameraPane />
            </div>
            <div className = "item4">
                
            </div>
            <div className = "item5">
                <Wheel />
            </div>
        </div>
    )
}
