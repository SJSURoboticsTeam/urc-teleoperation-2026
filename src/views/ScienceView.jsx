import 'react-resizable/css/styles.css';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { LineChart } from '@mui/x-charts/LineChart';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
function createData(vials, initialNM, finalNM, delta) {
        return { vials, initialNM, finalNM, delta };
    }
export default function ScienceView () {
    const rows = [
        createData('V1', 0, 0, 0),
        createData('V2', 0, 0, 0),
        createData('V3', 0, 0, 0),
    ];
    const [TabContent, setTabContent] = useState(0);
    const tabNum = [0,1,2]
    const handleChange = (event, newTabContent) => {
        setTabContent(newTabContent);
    };
    const margin = { right: 24 };
    const exampleFrequency1 = [515, 500, 515, 520, 515, 500, 525, 510, 500, 515, 500];
    const exampleFrequency2 = [545, 540, 545, 550, 540, 555, 545, 540, 545, 535, 545];
    const xTime = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110];
    const yRange = [0, 100, 200, 300, 400, 500, 600, 700]
    return (
        <div className="flex flex-1 flex-col justify-center overflow-auto items-center h-full min-h-0" style={{ userSelect: 'none' }}>
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
                <div className="step step-accent">Start</div>
                <div className="step step-accent">Site 1</div>
                <div className="step step-accent">Site 2</div>
                <div className="step step-accent">Site 3</div>
            </div>
            <Box sx={{ width: 600, height: 400}}>
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
                <Box sx={{p:1}}>
                    {tabNum.map((num) => ( TabContent === num ? (
                        <div key={num}>
                            <div className="flex flex-row gap-4 mb-4">
                                <div className="overflow-x-auto">
                                    <div className="steps">
                                        <div className="step step-accent">Start</div>
                                        <div className="step step-accent">Step 1</div>
                                        <div className="step step-accent">Step 2</div>
                                        <div className="step step-accent">Step 3</div>
                                        <div className="step step-accent">Step 4</div>
                                        <div className="step step-accent">Step 5</div>
                                        <div className="step step-accent">Step 6</div>
                                    </div>
                                </div>
                                <Box sx={{ ml: 5, width: 200 }}> Coordinates: (_,_) <br/> Accuracy: ___ <br/> Range: ___ <br/> </Box>
                                <Button variant="contained"
                                    sx={{
                                        border: 1,
                                        borderColor: "black",
                                        height: 45,
                                        width: 90,
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
                                <Box sx={{ width: 800, height: 300 }}>
                                    <LineChart
                                        series={[
                                        {data: exampleFrequency1, label: 'Frequency 1'},
                                        {data: exampleFrequency2, label: 'Frequency 2'}
                                        ]}
                                        xAxis={[{scaleType: 'point', data: xTime, height: 25 }]}
                                        yAxis={[{width: 45 }]}
                                        margin ={margin}
                                    />
                                    </Box>
                                <TableContainer component={Paper}>
                                    <Table sx={{ minWidth: 100}} aria-label="simple table">
                                        <TableHead>
                                        <TableRow>
                                            <TableCell>vials</TableCell>
                                            <TableCell align="right">initial</TableCell>
                                            <TableCell align="right">final</TableCell>
                                            <TableCell align="right">delta</TableCell>
                                        </TableRow>
                                        </TableHead>
                                        <TableBody>
                                        {rows.map((row) => (
                                            <TableRow
                                            key={row.vials}
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                            >
                                            <TableCell component="th" scope="row">
                                                {row.vials}
                                            </TableCell>
                                            <TableCell align="right">{row.initialNM}</TableCell>
                                            <TableCell align="right">{row.finalNM}</TableCell>
                                            <TableCell align="right">{row.delta}</TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </div>
                        </div> 
                    ) : null ))}
                </Box>
            </Box>     
        </div>
    )
}
