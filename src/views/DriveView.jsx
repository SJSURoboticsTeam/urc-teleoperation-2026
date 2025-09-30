import 'react-resizable/css/styles.css' // Import default styles
import DriveManualInput from '../components/drive/DriveManualInput'
import CameraPane from '../components/drive/CameraPane'
import Map from '../components/drive/Map'
import Wheel from '../components/drive/Wheel'

import '../components/drive/drive.css'

export default function DriveView (){
    return (
        <div class = "container">
            <div class = "item1">
                <DriveManualInput />
            </div>
            <div class = "item2"> 
                <Map />
            </div>
            <div class = "item3"> 
                <CameraPane />
                <CameraPane />
            </div>
            <div class = "item4">
                
            </div>
            <div class = "item5">
                <Wheel />
            </div>
        </div>
    )
}
