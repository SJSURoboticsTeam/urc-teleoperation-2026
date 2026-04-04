import 'react-resizable/css/styles.css';
import {useAntennaData} from './metrics';
import { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import {Button, Box} from '@mui/material';

export default function MetricsGraph() {
    const antenna = useAntennaData();

    const initialData = [-98, -92, -95, -80, -75, -81, -60, -61, -59, -70];
    const initialTime = [100,200,300,400,500,600,700,800,900,1000];
    const [running, setRunning] = useState(false);
    const [time, setTime] = useState(initialTime);
    const [signalData, setSignalData] = useState(initialData);


    useEffect(() => {
        if (!running) return;
        
        const intervalId = setInterval(() => {
            setSignalData((prev) => [
                ...prev.slice(1),
                Math.max(-98, Math.min(-32, prev.at(-1) + Math.floor(Math.random() * 21) - 10))
            ]);
            setTime((prev) => {
                const last = prev.at(-1);
                return [...prev.slice(1), last + 100];
            });
        }, 500);
        return () => clearInterval(intervalId);
    }, [running]);

    return (
        <Box sx={{width: '75%'}}>
            <LineChart
                height={500}
                skipAnimation
                series={[
                {   
                    data: signalData, id: 'Signal Strength',
                },]}
                xAxis={[{ data: time, label: 'Time (ms)' }]}
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
                sx={{ ml:1, width: 'auto'}}
                onClick={() => {
                setSignalData(initialData);
                setTime(initialTime);
                }}
            >
                reset
            </Button>
        </Box>
    )
}
