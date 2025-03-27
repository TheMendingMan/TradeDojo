// src/components/StockDashboard.jsx
import React from 'react';

const StockDashboard = ({ simulationData, startDate, timeFrame, darkMode }) => {
  if (!simulationData || simulationData.length === 0 || simulationData[0].length === 0) return null;
  
  // Compute slice based on timeFrame.
  const fullData = simulationData[0];
  const mapping = { '1Q': 63, '1Y': 252, '5Y': 1260, 'ALL': fullData.length };
  const sliceDays = mapping[timeFrame] || fullData.length;
  const startIdx = fullData.length > sliceDays ? fullData.length - sliceDays : 0;
  const dataSlice = fullData.slice(startIdx);

  // Compute metrics.
  const startingPrice = dataSlice[0] ?? 0;
  const currentPrice = dataSlice[dataSlice.length - 1] ?? 0;
  const percentChange = (((currentPrice - startingPrice) / startingPrice) * 100).toFixed(2);
  const shares = 1000000;
  const marketCap = (currentPrice * shares).toFixed(2);
  const allTimeHigh = Math.max(...dataSlice).toFixed(2);
  const allTimeLow = Math.min(...dataSlice).toFixed(2);

  // Styles.
  const containerStyle = {
    border: darkMode ? '1px solid #444' : '1px solid #ddd',
    backgroundColor: darkMode ? '#333' : '#f9f9f9',
    color: darkMode ? '#eee' : '#333',
    padding: '10px',
    borderRadius: '5px',
    marginTop: '20px'
  };
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px'
  };
  const itemStyle = { textAlign: 'center' };

  return (
    <div style={containerStyle}>
      <h3>Stock Dashboard</h3>
      <div style={gridStyle}>
        <div style={itemStyle}>
          <strong>Starting Price</strong>
          <p>${(startingPrice ?? 0).toFixed(2)}</p>

        </div>
        <div style={itemStyle}>
          <strong>Current Price</strong>
          <p>${(currentPrice ?? 0).toFixed(2)}</p>

        </div>
        <div style={itemStyle}>
          <strong>% Change</strong>
          <p>{percentChange}%</p>
        </div>
        <div style={itemStyle}>
          <strong># of Shares</strong>
          <p>{shares.toLocaleString()}</p>
        </div>
        <div style={itemStyle}>
          <strong>Market Cap</strong>
          <p>${marketCap}</p>
        </div>
        <div style={itemStyle}>
          <strong>All Time High</strong>
          <p>${allTimeHigh}</p>
        </div>
        <div style={itemStyle}>
          <strong>All Time Low</strong>
          <p>${allTimeLow}</p>
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;
