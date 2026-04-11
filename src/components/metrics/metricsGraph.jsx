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
    const antenna = useAntennaData();

    const [time, setTime] = useState([]);
    const [signalData, setSignalData] = useState([]);

    useEffect(() => {
        if (antenna.status !== "GOOD" || antenna.roverRSSI == null) return;
            setSignalData((prev) => {
                return [...prev, antenna.roverRSSI].slice(-20);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-20);
            });
    }, [antenna.status, antenna.roverRSSI]);

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
    const antenna = useAntennaData();

    const [time, setTime] = useState([]);
    const [noiseData, setNoiseData] = useState([]);

    useEffect(() => {
        if (antenna.status !== "GOOD" || antenna.noise == null) return;
            setNoiseData((prev) => {
                return [...prev, antenna.noise].slice(-20);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-20);
            });
    }, [antenna.status, antenna.noise]);

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
    const antenna = useAntennaData();

    const [time, setTime] = useState([]);
    const [efficiencyData, setEfficiencyData] = useState([]);

    useEffect(() => {
        if (antenna.status !== "GOOD" || antenna.efficiency == null) return;
            setEfficiencyData((prev) => {
                return [...prev, antenna.efficiency].slice(-20);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-20);
            });
    }, [antenna.status, antenna.efficiency]);

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
    const antenna = useAntennaData();

    const [time, setTime] = useState([]);
    const [TxData, setTxData] = useState([]);
    const [RxData, setRxData] = useState([]);

    useEffect(() => {
        if (antenna.status !== "GOOD" || antenna.txrate == null || antenna.rxrate == null) return;
            setTxData((prev) => {
                return [...prev, antenna.txrate].slice(-20);
            });
            setRxData((prev) => {
                return [...prev, antenna.rxrate].slice(-20);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-20);
            });
    }, [antenna.status, antenna.txrate, antenna.rxrate]);

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
