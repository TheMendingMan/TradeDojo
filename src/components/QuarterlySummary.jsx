// src/components/QuarterlySummary.jsx
import React from 'react';

const QuarterlySummary = ({ simulationData, startDate, darkMode }) => {
  if (!simulationData || simulationData.length === 0 || simulationData[0].length === 0) return null;

  // Use the first simulation run for quarterly summary
  const sim = simulationData[0];
  const quarterInterval = 63; // trading days per quarter
  const summary = [];
  for (let i = quarterInterval - 1; i < sim.length; i += quarterInterval) {
    summary.push({ index: i, price: sim[i] });
  }

  const getQuarterLabel = (index) => {
    const conversionFactor = 365 / 252;
    const offset = Math.round(index * conversionFactor);
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);
    const month = date.getMonth();
    const quarter = month < 3 ? "Q1" : month < 6 ? "Q2" : month < 9 ? "Q3" : "Q4";
    return `${date.getFullYear()} ${quarter}`;
  };

  const cardStyle = {
    border: darkMode ? '1px solid #444' : '1px solid #ddd',
    borderRadius: '5px',
    padding: '10px',
    backgroundColor: darkMode ? '#333' : '#f9f9f9',
    color: darkMode ? '#eee' : '#333',
    margin: '5px',
    textAlign: 'center',
    minWidth: '120px'
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
      {summary.map((q, idx) => (
        <div key={idx} style={cardStyle}>
          <h4>{getQuarterLabel(q.index)}</h4>
          <p>Price: ${q.price.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
};

export default QuarterlySummary;
