import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const RechartsStockSimulator = () => {
  // State for full simulated data, current displayed index, and playing flag.
  const [data, setData] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  // Generate simulated data once on mount (500 points of a random walk)
  useEffect(() => {
    let price = 100;
    const generatedData = [];
    for (let i = 0; i < 500; i++) {
      price += (Math.random() - 0.5) * 2;
      generatedData.push({ time: i, price: Number(price.toFixed(2)) });
    }
    setData(generatedData);
  }, []);

  // Start the simulation loop: increase the index every 100ms
  const startSimulation = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev < data.length) {
          return prev + 1;
        } else {
          clearInterval(intervalRef.current);
          return prev;
        }
      });
    }, 100);
  };

  // Stop the simulation loop
  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    setPlaying((prev) => !prev);
  };

  // When 'playing' state changes, start or stop the simulation
  useEffect(() => {
    if (playing) {
      startSimulation();
    } else {
      stopSimulation();
    }
    // Clean up on unmount
    return () => stopSimulation();
  }, [playing]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#111', color: '#DDD', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center' }}>Recharts Stock Simulator</h1>
      <LineChart width={600} height={300} data={data.slice(0, index)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="time"
          label={{ value: 'Time', position: 'insideBottomRight', offset: 0 }}
          stroke="#DDD"
        />
        <YAxis
          domain={['auto', 'auto']}
          label={{ value: 'Price', angle: -90, position: 'insideLeft' }}
          stroke="#DDD"
        />
        <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none', color: '#DDD' }} />
        <Legend />
        <Line type="monotone" dataKey="price" stroke="#FFD700" dot={false} />
      </LineChart>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={togglePlay}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};

export default RechartsStockSimulator;
