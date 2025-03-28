import React, { useRef, useEffect, useState } from "react";
import { createChart } from "lightweight-charts";

function SimpleStockSimulator() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const requestRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // State for simulated data, current index, and play/pause status
  const [data, setData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // On mount, create the chart and generate 500 simulated data points
  useEffect(() => {
    if (chartContainerRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          backgroundColor: "#111",
          textColor: "#DDD",
        },
        grid: {
          vertLines: { color: "#333" },
          horzLines: { color: "#333" },
        },
        timeScale: {
          timeVisible: true,
          tickMarkFormatter: (time) => `Tick ${time}`,
        },
        handleScroll: true,
        handleScale: true,
      });
      seriesRef.current = chartRef.current.addLineSeries({ color: "#FFD700" });
    }

    // Generate a random-walk series with 500 points
    let price = 100;
    const generatedData = [];
    for (let i = 0; i < 500; i++) {
      price += (Math.random() - 0.5) * 2;
      generatedData.push({ time: i, value: Math.round(price * 100) / 100 });
    }
    setData(generatedData);
  }, []);

  // Update the chart whenever the currentIndex changes
  useEffect(() => {
    if (seriesRef.current && data.length) {
      // Plot data from the beginning to the current index
      seriesRef.current.setData(data.slice(0, currentIndex));
    }
  }, [currentIndex, data]);

  // The simulation loop uses requestAnimationFrame for smooth updates
  const simulationLoop = () => {
    const now = Date.now();
    // Update every 100ms (adjust this interval as desired)
    if (now - lastUpdateRef.current >= 100) {
      lastUpdateRef.current = now;
      setCurrentIndex((prev) => {
        if (prev < data.length) return prev + 1;
        setPlaying(false);
        return prev;
      });
    }
    requestRef.current = requestAnimationFrame(simulationLoop);
  };

  // Toggle play/pause state and start/stop the simulation loop
  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      cancelAnimationFrame(requestRef.current);
    } else {
      setPlaying(true);
      lastUpdateRef.current = Date.now();
      requestRef.current = requestAnimationFrame(simulationLoop);
    }
  };

  return (
    <div>
      <div
        ref={chartContainerRef}
        style={{ border: "1px solid #333", marginBottom: "10px" }}
      />
      <button onClick={togglePlay}>{playing ? "Pause" : "Play"}</button>
    </div>
  );
}

export default SimpleStockSimulator;
