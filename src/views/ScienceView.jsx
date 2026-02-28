import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Typography } from '@mui/material';
export default function ScienceView () {
    const variables = ["Repeat","Pause", "Complete"];
    const sensors = ["Load", "Humidity", "Pressure"]
    const [value, setValue] = useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    return (
        <div className="flex flex-row gap-6" >
            <div className="flex flex-col" >
                <Box sx = {{
                    border:1, 
                    borderColor: 'black',
                    width: 250,
                    height: 100,
                    display: 'flex',
                    justifyContent: 'left',
                    padding: 1,
                    mt: 5,
                    mb: 5
                }}>
                    Current Step:
                </Box>
                <div className="flex items-center" >
                    {sensors.map((sensor) => (
                        <Box sx = {{
                            border: 1,
                            borderColor: 'black',
                            width: 75,
                            height: 60,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            padding: 1,
                            mt: 1,
                            mr: 1
                        }}>
                            <Typography variant="body2"sx={{mt:4}}>
                            {sensor} Data
                            </Typography>
                            <Typography variant="body1" sx={{mt:3}}>
                            {sensor} 
                            </Typography>
                        </Box>
                    ))}      
                </div> 
                <Box sx={{ width: 400, height: 200, mt: 5, border:1 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', }}>
                        <Tabs value={value} onChange={handleChange}>
                            <Tab label="Item One"/>
                            <Tab label="Item Two" />
                        </Tabs>
                    </Box>
                    {value === 0 && <Box sx={{ p: 2 }}>Color Sensor</Box>}
                    {value === 1 && <Box sx={{ p: 2 }}>Temperature Sensor</Box>}
                </Box>
            </div>     
            <div className="flex flex-col items-center">
                <div className="flex flex-row gap-4 mb-2">
                    <Button variant='contained'sx = {{ 
                                    border:1,
                                    borderColor: 'black',
                                    height: 40,
                                    width: 100,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginBottom: 15,
                                    marginTop: 5,
                                    ml:15
                        }}>
                            Step
                    </Button>
                    <Button variant='contained'sx = {{ 
                            border:1,
                            borderColor: 'black',
                            width: 100,
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: 15,
                            marginTop: 5,
                            marginLeft: 1,
                    }}>
                        Stop
                    </Button>
                </div>
                <div className="flex flex-col gap-2 mb-2 items-center justify-center">
                {variables.map((variable) => (
                    <Button variant='contained' sx = {{ 
                            border:1,
                            borderColor: 'black',
                            width: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 1,
                            ml:15
                    }}>
                        {variable}
                </Button>
               ))}
                </div>
            </div>
        </div>
    )
}