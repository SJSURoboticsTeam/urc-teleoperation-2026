import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Typography } from '@mui/material';
export default function ScienceView () {
    const [TabContent, setTabContent] = useState(0);
    const tabNum = [0,1,2]
    const handleChange = (event, newTabContent) => {
        setTabContent(newTabContent);
    };
    return (
        <div className="flex flex-1 flex-col justify-center items-center h-full min-h-0" style={{ userSelect: 'none' }}>
            <div className = 'flex flex-row justify-center items-center'>
                <Button variant='contained'sx = {{ 
                        border:1,
                        borderColor: 'black',
                        height: 40,
                        width: 240,
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 2,
                        ml: 1,
                }}>
                    Start Site Investigation
                </Button>
                <Button variant='contained'sx = {{ 
                                border:1,
                                borderColor: 'black',
                                height: 40,
                                width: 100,
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: 2,
                                ml:1
                    }}>
                        Step
                </Button>
                <Button variant='contained'sx = {{ 
                        border:1,
                        borderColor: 'black',
                        backgroundColor: 'red',
                        height: 40,
                        width: 100,
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 2,
                        ml: 1,
                        mr: 15
                }}>
                    E-Stop
                </Button>
            </div>
            <div className="steps">
                <div className="step step-primary">Start</div>
                <div className="step">Site 1</div>
                <div className="step">Site 2</div>
                <div className="step">Site 3</div>
            </div>
            <Box sx={{ width: 600, height: 400, mt: 5, }}>
                <Box sx={{border: 1, borderRadius: 2, borderColor: 'divider'}}>
                    <Tabs
                        value={TabContent}
                        onChange={handleChange}
                        sx={{minHeight: 32, width: 'auto'}}
                    >
                        <Tab label="Site 1" sx={{fontSize: '0.75rem', minHeight: 32 }} />
                        <Tab label="Site 2" sx={{fontSize: '0.75rem', minHeight: 32 }} />
                        <Tab label="Site 3" sx={{fontSize: '0.75rem', minHeight: 32 }} />
                    </Tabs>
                </Box>
                <Box sx={{ p: 2 }}>
                    {tabNum.map((num) => (
                        TabContent === num ? (
                            <div key={num}>
                            <div className="flex flex-row gap-4 mb-4">
                                <div className="overflow-x-auto">
                                <div className="steps">
                                    <div className="step">Start</div>
                                    <div className="step">Step 1</div>
                                    <div className="step">Step 2</div>
                                    <div className="step">Step 3</div>
                                    <div className="step">Step 4</div>
                                    <div className="step">Step 5</div>
                                    <div className="step">Step 6</div>
                                </div>
                                </div>
                                <Box sx={{ ml: 5, width: 200 }}> Coordinates: (_,_) <br/> Accuracy: ___ <br/> Range: ___ <br/> </Box>
                                <Button variant="contained"
                                    sx={{
                                        border: 1,
                                        borderColor: "black",
                                        height: 35,
                                        width: 100,
                                        display: "flex",
                                        justifyContent: "center",
                                        ml: 2,
                                        fontSize: "0.75rem"
                                    }}
                                >
                                    GET GNSS
                                </Button>
                            </div>
                            <div className="flex flex-row gap-4 mb-4">
                                <Box sx={{ 
                                    width: 275, 
                                    height: 250, 
                                    border: 1, 
                                    borderColor: "black",
                                    mt: 1,
                                    }}> 
                                    graph 
                                </Box>
                                <Box sx={{ 
                                    width: 275, 
                                    height: 250, 
                                    border: 1, 
                                    borderColor: "black",
                                    mt: 1,
                                    ml: 2,
                                    }}> 
                                    table
                                </Box>
                            </div>
                        </div> ) : null ))}
                </Box>
            </Box>     
        </div>
    )
}