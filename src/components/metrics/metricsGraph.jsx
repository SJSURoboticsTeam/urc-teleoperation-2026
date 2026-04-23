import 'react-resizable/css/styles.css';
import {useAntennaData} from './metrics';
import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import {Button, Box} from '@mui/material';

export default function MetricsGraph() {
    return(
        <div className="flex flex-col">
            <div className="flex flex-row">
                <Box>
                    <SignalGraph/>
                </Box>
                <Box>
                    <NoiseGraph/>
                </Box>
            </div>
            <div className="flex flex-row">  
                <Box>
                    <EfficiencyGraph/>
                </Box>
                <Box>
                    <TxRxGraph/>
                </Box>
            </div>
        </div>
    )
}

function SignalGraph() {
    const [antenna900, antenna5] = useAntennaData();

    const [running, setRunning] = useState(false);
    const [time, setTime] = useState([]);
    const [signalData, setSignalData] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.roverRSSI == null) return;
            setSignalData((prev) => {
                return [...prev, antenna900.roverRSSI].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.roverRSSI, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                {   
                    data:signalData, id: 'Signal Strength', label: 'Signal Strength (dBm)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Signal Strength (dBm)', width: 50 }]}
            />
        
            <Button 
                variant="contained" 
                onClick={() => setRunning((p) => !p)}
                sx={{width: 'auto'}}>
                {running ? 'stop' : 'start'}
            </Button>
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setSignalData([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}

function NoiseGraph() {
    const [antenna900, antenna5] = useAntennaData();

    const [running, setRunning] = useState(false);
    const [time, setTime] = useState([]);
    const [noiseData, setNoiseData] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.noise == null) return;
            setNoiseData((prev) => {
                return [...prev, antenna900.noise].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.noise, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                {   
                    data:noiseData, id: 'Noise', label: 'Noise (dBm)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Noise (dBm)', width: 50 }]}
            />

            <Button 
                variant="contained" 
                onClick={() => setRunning((p) => !p)}
                sx={{width: 'auto'}}>
                {running ? 'stop' : 'start'}
            </Button>
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setNoiseData([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}

function EfficiencyGraph() {
    const [antenna900, antenna5] = useAntennaData();

    const [time, setTime] = useState([]);
    const [running, setRunning] = useState(false);
    const [efficiencyData, setEfficiencyData] = useState([]);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.efficiency == null) return;
            setEfficiencyData((prev) => {
                return [...prev, antenna900.efficiency].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.efficiency, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                {   
                    data:efficiencyData, id: 'Efficiency', label: 'Efficiency (%)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Efficiency (%)', width: 50 }]}
            />
        
            <Button
                variant="contained" 
                onClick={() => setRunning((p) => !p)}
                sx={{width: 'auto'}}>
                {running ? 'stop' : 'start'}
            </Button>
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setEfficiencyData([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}

function TxRxGraph() {
    const [antenna900, antenna5] = useAntennaData();

    const [time, setTime] = useState([]);
    const [TxData, setTxData] = useState([]);
    const [RxData, setRxData] = useState([]);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (!running || antenna900.status !== "GOOD" || antenna900.txrate == null || antenna900.rxrate == null) return;
            setTxData((prev) => {
                return [...prev, antenna900.txrate].slice(-30);
            });
            setRxData((prev) => {
                return [...prev, antenna900.rxrate].slice(-30);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-30);
            });
    }, [antenna900.status, antenna900.txrate, antenna900.rxrate, running]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={500}
                skipAnimation
                series={[
                { data:TxData, id: 'Tx', label: 'Tx (Mbps)'},
                { data:RxData, id: 'Rx', label: 'Rx (Mbps)'},
                ]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Tx/Rx (Mbps)', width: 50 }]}
            />
        
            <Button
                variant="contained" 
                onClick={() => setRunning((p) => !p)}
                sx={{width: 'auto'}}>
                {running ? 'stop' : 'start'}
            </Button>
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto', fontSize:12}}
                onClick={() => {
                setTxData([]);
                setRxData([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}
