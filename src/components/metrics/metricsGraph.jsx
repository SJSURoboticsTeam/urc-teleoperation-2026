import 'react-resizable/css/styles.css';
import {useAntennaData} from './metrics';
import {useState, useEffect} from 'react';
import {LineChart} from '@mui/x-charts/LineChart';
import {Button, Box} from '@mui/material';
import {InputLabel, MenuItem, FormControl, Select} from '@mui/material';

export default function MetricsGraph() {
    const [running, setRunning] = useState(false);
    const [reset, setReset] = useState(0);
    const [antenna900, antenna5] = useAntennaData();

    const [points, setPoints] = useState(10);

    const handleChange = (event) => {
        setPoints(event.target.value);
    };
    
    const colors = {
   "900": '#fe2a1a',
   "900-alt": '#ebd400',
   "5": '#2522f6',
   "5-alt": '#00e1e1'
};
    
    return(
        <div className="flex flex-col">
            <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', marginBottom: '16px' }}>
                <Button 
                    variant="contained" 
                    onClick={() => setRunning((p) => !p)}
                    sx={{width: '80px', fontSize: 16}}>
                    {running ? 'stop' : 'start'}
                </Button>
                <Button 
                    variant="contained" 
                    color="warning"
                    onClick={() => setReset(c => c + 1)}
                    sx={{width: '125px', fontSize: 16}}>
                    CLEAR ALL
                </Button>
                <Box sx={{ minWidth: 110 }}>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="demo-simple-select-label">Points</InputLabel>
                        <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={points}
                        label="POINTS"
                        onChange={handleChange}
                        >
                            <MenuItem value={10}>Ten</MenuItem>
                            <MenuItem value={20}>Twenty</MenuItem>
                            <MenuItem value={30}>Thirty</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </div>
            <div className="flex flex-row">
                <Box>
                    <SignalGraph 
                        antenna900={antenna900} 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}
                        reset={reset}
                        colors={colors}
                        points={points}/>
                </Box>
                <Box>
                    <NoiseGraph 
                        antenna900={antenna900} 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}
                        reset={reset}
                        colors={colors}
                        points={points}/>
                </Box>
            </div>
            <div className="flex flex-row">  
                <Box>
                    <TxRx900Graph 
                        antenna900={antenna900} 
                        running={running} 
                        setRunning={setRunning}
                        reset={reset}
                        colors={colors}
                        points={points}/>
                </Box>
                <Box>
                    <TxRx5Graph 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}
                        reset={reset}
                        colors={colors}
                        points={points}/>
                </Box>
            </div>
        </div>
    )
}

function SignalGraph({ antenna900, antenna5, running, setRunning, reset, points, colors }) {
    const [time, setTime] = useState([]);
    const [signalData900, setSignalData900] = useState([]);
    const [signalData5, setSignalData5] = useState([]);

    useEffect(() => {
        setSignalData900([]);
        setSignalData5([]);
        setTime([]);
    }, [reset]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.roverRSSI == null) return;
            setSignalData900((prev) => {
                return [...prev, antenna900.roverRSSI].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-(points));
            });
    }, [antenna900.status, antenna900.roverRSSI, running]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.roverRSSI == null) return;
            setSignalData5((prev) => {
                return [...prev, antenna5.roverRSSI].slice(-(points));
            });
    }, [antenna5.status, antenna5.roverRSSI, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                {   
                    data:signalData900, color: colors["900"], id: 'Signal Strength 900MHz', label: 'Signal Strength 900MHz (dBm)'
                },
                {   
                    data:signalData5, color: colors["5"], id: 'Signal Strength 5GHz', label: 'Signal Strength 5GHz (dBm)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Signal Strength (dBm)', width: 55 }]}
            />
        </Box>
    );
}

function NoiseGraph({ antenna900, antenna5, running, setRunning, reset, points, colors }) {
    const [time, setTime] = useState([]);
    const [noiseData900, setNoiseData900] = useState([]);
    const [noiseData5, setNoiseData5] = useState([]);

    useEffect(() => {
        setNoiseData900([]);
        setNoiseData5([]);
        setTime([]);
    }, [reset]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.noise == null) return;
            setNoiseData900((prev) => {
                return [...prev, antenna900.noise].slice(-(points));
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-(points));
            });
    }, [antenna900.status, antenna900.noise, running]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.noise == null) return;
            setNoiseData5((prev) => {
                return [...prev, antenna5.noise].slice(-(points));
            });
    }, [antenna5.status, antenna5.noise, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                {   
                    data:noiseData900, color: colors["900"], id: 'Noise 900MHz', label: 'Noise 900MHz (dBm)'
                },
                {   
                    data:noiseData5, color: colors["5"], id: 'Noise 5GHz', label: 'Noise 5GHz (dBm)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Noise (dBm)', width: 55 }]}
            />
        </Box>
    );
}

function TxRx900Graph({ antenna900, running, setRunning, reset, points, colors }) {
    const [time, setTime] = useState([]);
    const [TxData900, setTxData900] = useState([]);
    const [RxData900, setRxData900] = useState([]);

    useEffect(() => {
        setTxData900([]);
        setRxData900([]);
        setTime([]);
    }, [reset]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.txrate == null || antenna900.rxrate == null) return;
            setTxData900((prev) => {
                return [...prev, antenna900.txrate].slice(-(points));
            });
            setRxData900((prev) => {
                return [...prev, antenna900.rxrate].slice(-(points));
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-(points));
            });
    }, [antenna900.status, antenna900.txrate, antenna900.rxrate, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                { data:TxData900, color: colors["900"], id: 'Tx 900MHz', label: 'Tx 900MHz (Mbps)'},
                { data:RxData900,  color: colors["900-alt"], id: 'Rx 900MHz', label: 'Rx 900MHz (Mbps)'},
                ]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Tx/Rx 900MHz (Mbps)', width: 50 }]}
            />
        </Box>
    );
}

function TxRx5Graph({ antenna5, running, setRunning, reset, points, colors }) {
    const [time, setTime] = useState([]);
    const [TxData5, setTxData5] = useState([]);
    const [RxData5, setRxData5] = useState([]);

    useEffect(() => {
        setTxData5([]);
        setRxData5([]);
        setTime([]);
    }, [reset]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.txrate == null || antenna5.rxrate == null) return;
            setTxData5((prev) => {
                return [...prev, antenna5.txrate].slice(-(points));
            });
            setRxData5((prev) => {
                return [...prev, antenna5.rxrate].slice(-(points));
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-(points));
            });
    }, [antenna5.status, antenna5.txrate, antenna5.rxrate, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                { data:TxData5, id: 'Tx 5GHz', color: colors["5"], label: 'Tx 5GHz (Mbps)'},
                { data:RxData5, id: 'Rx 5GHz', color: colors["5-alt"], label: 'Rx 5GHz (Mbps)'},
                ]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Tx/Rx 5GHz (Mbps)', width: 50 }]}
            />
        </Box>
    );
}
