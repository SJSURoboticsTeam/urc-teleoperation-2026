import 'react-resizable/css/styles.css';
import {useAntennaData} from './metrics';
import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import {Button, Box} from '@mui/material';

export default function MetricsGraph() {
    const [running, setRunning] = useState(false);
    const [antenna900, antenna5] = useAntennaData();

    return(
        <div className="flex flex-col">
            <Button 
                variant="contained" 
                onClick={() => setRunning((p) => !p)}
                sx={{ml: 1,mb:2, width: '80px', fontSize: 16}}>
                {running ? 'stop' : 'start'}
            </Button>
            <div className="flex flex-row">
                <Box>
                    <SignalGraph 
                        antenna900={antenna900} 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}/>
                </Box>
                <Box>
                    <NoiseGraph 
                        antenna900={antenna900} 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}/>
                </Box>
            </div>
            <div className="flex flex-row">  
                <Box>
                    <EfficiencyGraph 
                        antenna900={antenna900} 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}/>
                </Box>
                <Box>
                    <TxRxGraph 
                        antenna900={antenna900} 
                        antenna5={antenna5} 
                        running={running} 
                        setRunning={setRunning}/>
                </Box>
            </div>
        </div>
    )
}

function SignalGraph({ antenna900, antenna5, running, setRunning }) {
    const [time, setTime] = useState([]);
    const [signalData900, setSignalData900] = useState([]);
    const [signalData5, setSignalData5] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.roverRSSI == null) return;
            setSignalData900((prev) => {
                return [...prev, antenna900.roverRSSI].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.roverRSSI, running]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.roverRSSI == null) return;
            setSignalData5((prev) => {
                return [...prev, antenna5.roverRSSI].slice(-30);
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
                    data:signalData900, id: 'Signal Strength 900MHz', label: 'Signal Strength 900MHz (dBm)'
                },
                {   
                    data:signalData5, id: 'Signal Strength 5GHz', label: 'Signal Strength 5GHz (dBm)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Signal Strength (dBm)', width: 50 }]}
            />
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setSignalData900([]);
                setSignalData5([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}

function NoiseGraph({ antenna900, antenna5, running, setRunning }) {
    const [time, setTime] = useState([]);
    const [noiseData900, setNoiseData900] = useState([]);
    const [noiseData5, setNoiseData5] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.noise == null) return;
            setNoiseData900((prev) => {
                return [...prev, antenna900.noise].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.noise, running]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.noise == null) return;
            setNoiseData5((prev) => {
                return [...prev, antenna5.noise].slice(-30);
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
                    data:noiseData900, id: 'Noise 900MHz', label: 'Noise 900MHz (dBm)'
                },
                {   
                    data:noiseData5, id: 'Noise 5GHz', label: 'Noise 5GHz (dBm)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Noise (dBm)', width: 50 }]}
            />

            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setNoiseData900([]);
                setNoiseData5([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}

function EfficiencyGraph({ antenna900, antenna5, running, setRunning }) {
    const [time, setTime] = useState([]);
    const [efficiencyData900, setEfficiencyData900] = useState([]);
    const [efficiencyData5, setEfficiencyData5] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.efficiency == null) return;
            setEfficiencyData900((prev) => {
                return [...prev, antenna900.efficiency].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.efficiency, running]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.efficiency == null) return;
            setEfficiencyData5((prev) => {
                return [...prev, antenna5.efficiency].slice(-30);
            });
    }, [antenna5.status, antenna5.efficiency, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                {   
                    data:efficiencyData900, id: 'Efficiency 900MHz', label: 'Efficiency 900MHz (%)'
                },
                {   
                    data:efficiencyData5, id: 'Efficiency 5GHz', label: 'Efficiency 5GHz (%)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Efficiency (%)', width: 50 }]}
            />
        
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setEfficiencyData900([]);
                setEfficiencyData5([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}

function TxRxGraph({ antenna900, antenna5, running, setRunning }) {
    const [time, setTime] = useState([]);
    const [TxData900, setTxData900] = useState([]);
    const [RxData900, setRxData900] = useState([]);
    const [TxData5, setTxData5] = useState([]);
    const [RxData5, setRxData5] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.txrate == null || antenna900.rxrate == null) return;
            setTxData900((prev) => {
                return [...prev, antenna900.txrate].slice(-30);
            });
            setRxData900((prev) => {
                return [...prev, antenna900.rxrate].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.txrate, antenna900.rxrate, running]);

    useEffect(() => {
        if (!running || antenna5.status !== "GOOD" || antenna5.txrate == null || antenna5.rxrate == null) return;
            setTxData5((prev) => {
                return [...prev, antenna5.txrate].slice(-30);
            });
            setRxData5((prev) => {
                return [...prev, antenna5.rxrate].slice(-30);
            });
    }, [antenna5.status, antenna5.txrate, antenna5.rxrate, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                { data:TxData900, id: 'Tx 900MHz', label: 'Tx 900MHz (Mbps)'},
                { data:RxData900, id: 'Rx 900MHz', label: 'Rx 900MHz (Mbps)'},
                { data:TxData5, id: 'Tx 5GHz', label: 'Tx 5GHz (Mbps)'},
                { data:RxData5, id: 'Rx 5GHz', label: 'Rx 5GHz (Mbps)'},
                ]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Tx/Rx (Mbps)', width: 50 }]}
            />
        
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setTxData900([]);
                setRxData900([]);
                setTxData5([]);
                setRxData5([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}
