import 'react-resizable/css/styles.css' // Import default styles
import DriveManualInput from './DriveManualInput'
import CameraPane from './CameraPane'
import Map from './Map'
import Controller from './Controller'
import Wheel from './Wheel'

import './drive.css'

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
                <Controller />
            </div>
            <div class = "item5">
                <Wheel />
            </div>
        </div>
    )
}
