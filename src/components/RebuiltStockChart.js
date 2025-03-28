import React, { useState, useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const RebuiltStockChart = () => {
  // Refs for container, chart, series, and animation frame ID
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastUpdateTime = useRef(Date.now());

  // State for historical data, current index, and play state
  const [historicalData, setHistoricalData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // On mount, create the chart using the container ref
  useEffect(() => {
    if (chartContainerRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          backgroundColor: '#111',
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: '#333' },
          horzLines: { color: '#333' },
        },
        timeScale: {
          timeVisible: true,
          tickMarkFormatter: time => `Tick ${time}`,
        },
        handleScroll: true,
        handleScale: true,
      });
      seriesRef.current = chartRef.current.addLineSeries({ color: '#10b981' });
    }
  }, []);

  // Generate or load your historical data once (simulate fetch)
  useEffect(() => {
    // For demonstration, generate a random walk of 500 data points
    let price = 100;
    const generatedData = [];
    for (let i = 0; i < 500; i++) {
      price += (Math.random() - 0.5) * 2;
      generatedData.push({ time: i, value: Math.round(price * 100) / 100 });
    }
    setHistoricalData(generatedData);
  }, []);

  // Whenever currentIndex or historicalData changes, update the chart series
  useEffect(() => {
    if (seriesRef.current && historicalData.length > 0) {
      // Plot data from the beginning up to the current index
      seriesRef.current.setData(historicalData.slice(0, currentIndex));
    }
  }, [currentIndex, historicalData]);

  // Simulation loop: advances the currentIndex gradually
  const simulationLoop = () => {
    if (!playing) return;
    const now = Date.now();
    // Update every 100ms (adjust for faster or slower playback)
    if (now - lastUpdateTime.current >= 100) {
      lastUpdateTime.current = now;
      setCurrentIndex(prev => {
        if (prev < historicalData.length) {
          return prev + 1;
        } else {
          setPlaying(false);
          return prev;
        }
      });
    }
    animationFrameId.current = requestAnimationFrame(simulationLoop);
  };

  // Toggle play/pause and start/stop the simulation loop
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    } else {
      setPlaying(true);
      lastUpdateTime.current = Date.now();
      simulationLoop();
    }
  };

  return (
    <div>
      <div
        ref={chartContainerRef}
        style={{ border: '1px solid #333', marginBottom: '10px' }}
      />
      <button onClick={togglePlay}>{playing ? 'Pause' : 'Play'}</button>
    </div>
  );
};

export default RebuiltStockChart;
