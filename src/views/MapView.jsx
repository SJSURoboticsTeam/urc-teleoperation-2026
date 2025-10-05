import { Resizable, ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css' // Import default styles
import Map from '../components/drive/Map.jsx';
// Import list of components, in index.jsx? 
// or do I handpick the components I want 

// In the future, it's one of these per view (drive, arm, science, etc)
export default function FullscreenMap() {

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Map/>
        </div>
    )
}