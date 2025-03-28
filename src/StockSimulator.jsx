import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const SimpleStockSimulator = () => {
  const containerRef = useRef(null);
  const [data, setData] = useState([]);
  const [timeIndex, setTimeIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastTickRef = useRef(Date.now());

  // Create the chart and generate simulated data once on mount
  useEffect(() => {
    if (containerRef.current) {
      // Create the chart
      chartRef.current = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: { background: { color: '#111' }, textColor: '#DDD' },
        grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
        timeScale: { 
          timeVisible: true, 
          tickMarkFormatter: time => `Tick ${time}` 
        },
        handleScroll: true,
        handleScale: true,
      });
      // Add a yellow line series
      seriesRef.current = chartRef.current.addLineSeries({ color: '#FFD700' });
    }
    
    // Generate 500 points of simulated data (random walk)
    let price = 100;
    const simulatedData = [];
    for (let i = 0; i < 500; i++) {
      price += (Math.random() - 0.5) * 2;
      simulatedData.push({ time: i, value: Math.round(price * 100) / 100 });
    }
    setData(simulatedData);
    
    // Start with an empty dataset on the chart
    if (seriesRef.current) {
      seriesRef.current.setData([]);
    }
  }, []);

  // Update the chart data whenever timeIndex changes
  useEffect(() => {
    if (data.length && seriesRef.current) {
      seriesRef.current.setData(data.slice(0, timeIndex + 1));
    }
  }, [timeIndex, data]);

  // Simulation loop using requestAnimationFrame
  const simulationLoop = () => {
    if (!running) return;
    const now = Date.now();
    // Update every 100ms (adjust this value for speed)
    if (now - lastTickRef.current >= 100) {
      lastTickRef.current = now;
      setTimeIndex(prev => {
        if (prev >= data.length - 1) {
          setRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }
    animationFrameId.current = requestAnimationFrame(simulationLoop);
  };

  const togglePlay = () => {
    if (running) {
      setRunning(false);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    } else {
      setRunning(true);
      lastTickRef.current = Date.now();
      simulationLoop();
    }
  };

  return (
    <div>
      <div 
        ref={containerRef} 
        style={{ border: '1px solid #333', marginBottom: '10px' }}
      ></div>
      <button onClick={togglePlay}>
        {running ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};

export default SimpleStockSimulator;
