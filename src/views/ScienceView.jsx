import 'react-resizable/css/styles.css';
import CameraPane from '../components/cameras/CameraPane';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useState } from 'react';
export default function ScienceView () {
    const variables = ["Stop", "Pause", "Complete"];
    const [currentStep, setCurrentStep] = useState(0);
    const [cycle, setCycle] = useState(0);
    const steps = ["Drill 10cm in one direction", "Open the door", "Move cup out", "Reverse drill direction", "Dirt moves into cup", "Cup is moved inside"];
    const handleStepClick = () => {
        setCurrentStep((prev) => (prev + 1) % 7);
        if (currentStep == 6 && cycle < 3){
            setCycle((prev)=> (prev+1));
        }
    };
    const handleStopClick = () => {
        setCurrentStep(0);
        setCycle(0);
    };
    let displayText;
    if (cycle == 3) {
        displayText = "completed";
    } else if(cycle<=3){
        displayText = steps[currentStep-1];
    } else {
        displayText = currentStep === 0 ? "stopped" : steps[currentStep - 1];
    }
    return (
        <div className="grid grid-flow-col" style={{ gridTemplateRows: '70%',  gridTemplateColumns: '40% 30% 30%', height: '100%' }}>
        <div className="h-full flex flex-col justify-center"><CameraPane /> </div>
        <div className="row-span-3 flex flex-col items-center">
            <div className="flex flex-row gap-4 mb-2">
                <Button variant='contained' onClick={handleStepClick} sx = {{ 
                        border:1,
                        borderColor: 'black',
                        width: 100,
                        display: 'flex',
                        justifyContent: 'center',
                        marginRight: 1,
                        marginBottom: 15,
                        marginTop: 5,
                }}>
                    Step
                </Button>
                <Button variant='contained' onClick={handleStepClick} sx = {{ 
                        border:1,
                        borderColor: 'black',
                        width: 100,
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 15,
                        marginTop: 5,
                }}>
                    Drill
                </Button>
            </div>
            <div className="flex flex-col gap-2 mb-2 items-center justify-center">
                {variables.map((variable) => (
                    <Button variant='contained' onClick={handleStopClick} sx = {{ 
                            border:1,
                            borderColor: 'black',
                            width: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 1,
                    }}>
                        {variable}
                </Button>
               ))}
            </div>
        </div>
        <div className="row-span-3">
            details:
            <Box sx = {{
                border:1, 
                borderColor: 'black',
                width: 300,
                height: 400,
                display: 'flex',
                justifyContent: 'center',
                padding: 1,
                marginTop:2,
            }}>
                Current Step:
                <br/ >
                {displayText}
                <br/ >
                <br/ >
                Completed Cycles: {cycle}
            </Box>
        </div>
        </div>
    )
}