import 'react-resizable/css/styles.css';
import {useAntennaData} from './metrics';
import { useState, useEffect } from 'react';
import { Typography } from '@mui/material/Typography';
import Select from '@mui/material/Select';
import { LineChart } from '@mui/x-charts/LineChart';

export function Graph() {
    const antenna = useAntennaData();
    const [interval, setInterval] = useState([]);

    useEffect(() => {
        if (antenna.status === "GOOD") {
            setInterval((prev) => [
                ...prev.slice(30),
                {time: new Date(), signal: antenna.roverRSSI}
            ]);
        }
    }, [antenna]);

    return (
        <div>
            {antenna.status === "GOOD" ? (
            <LineChart
                height={300}
                skipAnimation
                series={[
                {   
                    data: interval.map((entry) => ({x: entry.time, y: entry.signal})), 
                },]}
                xAxis={[{ type: 'time', label: 'Time' },]}
                yAxis={[{ label: 'Signal Strength (dBm)', width: 50 }]}
            />
            ):(
                <Typography sx={{ color: "black" }}>
                    No data available for graph
                </Typography>
            )}
        </div>
    )
}

export default function MetricsGraph() {
    return (
        <Select>
            <Graph />
        </Select>
    )
}