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
                <Box>
                    <EfficiencyGraph/>
                </Box>
            </div>
            <div className="flex flex-row">  
                <Box>
                    <TxRxGraph/>
                </Box>
                <Box>
                    <FrequencyGraph/>
                </Box>
                <Box>
                    <FrequencyWidthGraph/>
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
                width={400}
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
                sx={{ ml:1, width: 'auto'}}
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
                width={400}
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
                sx={{ ml:1, width: 'auto'}}
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
                width={400}
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
                sx={{ ml:1, width: 'auto'}}
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
function FrequencyWidthGraph() {
    const antenna = useAntennaData();

    const [time, setTime] = useState([]);
    const [frequencyWidthData, setFrequencyWidthData] = useState([]);

    useEffect(() => {
        if (antenna.status !== "GOOD" || antenna.freqw == null) return;
            setFrequencyWidthData((prev) => {
                return [...prev, antenna.freqw].slice(-20);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-20);
            });
    }, [antenna.status, antenna.freqw]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={400}
                skipAnimation
                series={[
                {   
                    data:frequencyWidthData, id: 'FrequencyWidth', label: 'Frequency Width (MHz)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Frequency Width (MHz)', width: 50 }]}
            />
        
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto'}}
                onClick={() => {
                setFrequencyWidthData([]);
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
                width={400}
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
                sx={{ ml:1, width: 'auto'}}
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
function FrequencyGraph() {
    const antenna = useAntennaData();

    const [time, setTime] = useState([]);
    const [frequencyData, setFrequencyData] = useState([]);

    useEffect(() => {
        if (antenna.status !== "GOOD" || antenna.freq == null) return;
            setFrequencyData((prev) => {
                return [...prev, antenna.freq].slice(-20);
            });
            setTime((prev) => {
                    const updateTime = prev.length === 0 ? 0 : prev.at(-1) + 1;
                    return [...prev, updateTime].slice(-20);
            });
    }, [antenna.status, antenna.freq]);

    return (    
        <Box sx={{width: '75%'}}>
            <LineChart
                height={300}
                width={400}
                skipAnimation
                series={[
                {   
                    data:frequencyData, id: 'Frequency', label: 'Frequency (MHz)'
                },]}
                xAxis={[{ type: 'linear', data: time, label: 'Time (s)' }]}
                yAxis={[{ label: 'Frequency (MHz)', width: 50 }]}
            />
        
            <Button
                variant="outlined"
                sx={{ ml:1, width: 'auto'}}
                onClick={() => {
                setFrequencyData([]);
                setTime([]);
                }}
            >
                reset
            </Button>
        </Box>
    );
}