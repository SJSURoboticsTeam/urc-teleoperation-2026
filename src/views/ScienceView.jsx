import { Resizable, ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css' // Import default styles
// Import list of components, in index.jsx? 
// or do I handpick the components I want 

// In the future, it's one of these per view (drive, arm, science, etc)
export default function ArmView () {

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <span>This is the science view!!</span>
        </div>
    )
}