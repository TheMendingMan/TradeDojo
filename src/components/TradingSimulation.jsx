import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import Papa from 'papaparse';

function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const TradingSimulation = ({
  onUpdateData,
  onSimulationParams,
  onUpdateLastShock,
  variableMode,
  onVariableModeChange,
  darkMode,
  dataSource,
  selectedTicker
}) => {
  const [simData, setSimData] = useState([[100]]);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const [realPrices, setRealPrices] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [drift, setDrift] = useState(0.0002);
  const [volatility, setVolatility] = useState(0.01);

  const [startDate] = useState(new Date('2025-01-01'));
  const [timeFrame, setTimeFrame] = useState('ALL');
  const quarterDuration = 63;
  const conversionFactor = 365 / 252;

  useEffect(() => {
    if (onSimulationParams) onSimulationParams({ drift, volatility });
  }, [drift, volatility]);

  useEffect(() => {
    if (dataSource === 'real') {
      fetch(`/data/${selectedTicker}_full.csv`)
        .then(res => res.text())
        .then(csv => {
          const parsed = Papa.parse(csv, { header: true });
          const allPrices = parsed.data
            .map(row => parseFloat(row['Close']))
            .filter(price => !isNaN(price));
          setRealPrices(allPrices);
          setSimData([[allPrices[0]]]);
          setTime(0);
        });
    }
  }, [dataSource, selectedTicker]);

  useEffect(() => {
    if (dataSource === 'random') {
      setSimData([[100]]);
      setTime(0);
    }
  }, [dataSource]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (dataSource === 'real') {
          if (realPrices.length > 0 && time < realPrices.length - 1) {
            const nextPrice = realPrices[time + 1];
            setSimData(prev => prev.map(sim => [...sim, nextPrice]));
            setTime(prev => prev + 1);
          }
        } else if (dataSource === 'random') {
          const shock = randomNormal();
          const factor = Math.exp((drift - 0.5 * volatility ** 2) + volatility * shock);
          setSimData(prev =>
            prev.map(sim => {
              const lastVal = sim[sim.length - 1];
              const nextVal = Math.max(lastVal * factor, 0.01);
              return [...sim, nextVal];
            })
          );
          setTime(prev => prev + 1);
        }
      }, 1000 / speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, time, speed, dataSource, realPrices, drift, volatility]);

  useEffect(() => {
    if (onUpdateData) onUpdateData(simData);
  }, [simData]);

  const currentSimDate = new Date(startDate);
  currentSimDate.setDate(startDate.getDate() + Math.round(time * conversionFactor));
  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const currentDayInQuarter = (time % quarterDuration) + 1;
  const daysUntilQuarterEnd = quarterDuration - currentDayInQuarter;

  const handleAdvance = (days) => {
    if (dataSource !== 'random') return;
    let newTime = time;
    setSimData(prevData =>
      prevData.map(sim => {
        const newSim = [...sim];
        for (let i = 0; i < days; i++) {
          const lastVal = newSim[newSim.length - 1];
          const shock = randomNormal();
          const factor = Math.exp((drift - 0.5 * volatility ** 2) + volatility * shock);
          const newVal = Math.max(lastVal * factor, 0.01);
          newTime++;
          newSim.push(newVal);
        }
        return newSim;
      })
    );
    setTime(newTime);
  };

  const displayed = simData.map(sim => {
    const fullLength = sim.length;
    const mapping = { '1Q': 63, '1Y': 252, '5Y': 1260, 'ALL': fullLength };
    const sliceDays = mapping[timeFrame] || fullLength;
    const startIdx = fullLength > sliceDays ? fullLength - sliceDays : 0;
    return sim.slice(startIdx);
  });

  const chartData = {
    labels: displayed[0].map((_, idx) => idx),
    datasets: displayed.map((sim, i) => ({
      label: `Sim ${i + 1}`,
      data: sim,
      borderColor: 'green',
      fill: false,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 0,
      borderWidth: 2
    }))
  };

  const chartOptions = {
    animation: { duration: 0 },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: darkMode ? '#eee' : '#333' } },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: {
        title: { display: true, text: 'Price', color: darkMode ? '#eee' : '#333' },
        grid: { color: darkMode ? '#555' : '#ccc' },
        ticks: { color: darkMode ? '#eee' : '#333' }
      }
    }
  };

  return (
    <div style={{ border: darkMode ? '1px solid #444' : '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
      <div style={{ marginBottom: '10px' }}>
        {!running ? (
          <button onClick={() => setRunning(true)}>Start</button>
        ) : (
          <button onClick={() => setRunning(false)}>Stop</button>
        )}
        <label style={{ marginLeft: '10px' }}>Speed: </label>
        <input type="range" min="1" max="20" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
        <span> {speed}x</span>
        {dataSource === 'random' && (
          <>
            <button onClick={() => handleAdvance(quarterDuration)}>Advance 1Q</button>
            <button onClick={() => handleAdvance(252)}>Advance 1Y</button>
            <button onClick={() => handleAdvance(1260)}>Advance 5Y</button>
            <div style={{ marginTop: '15px' }}>
              <label>📉 Drift: {drift.toFixed(4)}</label>
              <input
                type="range"
                min="-0.01"
                max="0.01"
                step="0.0001"
                value={drift}
                onChange={(e) => setDrift(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <br />
              <label>⚡ Volatility: {volatility.toFixed(4)}</label>
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.0005"
                value={volatility}
                onChange={(e) => setVolatility(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ height: '300px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div style={{ marginTop: '10px' }}>
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: darkMode ? '#FFD700' : '#003366' }}>
          Days until End of Quarter: {daysUntilQuarterEnd} <br />
          Simulated Date: {formatDate(currentSimDate)}
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          <button onClick={() => setTimeFrame('1Q')}>Show 1Q</button>
          <button onClick={() => setTimeFrame('1Y')}>Show 1Y</button>
          <button onClick={() => setTimeFrame('5Y')}>Show 5Y</button>
          <button onClick={() => setTimeFrame('ALL')}>Show All</button>
        </div>
      </div>
    </div>
  );
};

export default TradingSimulation;
