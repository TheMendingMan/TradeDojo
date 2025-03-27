import React from 'react';

const MarketSentimentMeter = ({ drift, volatility, darkMode }) => {
  // Convert drift and volatility from string to float
  const driftVal = parseFloat(drift);
  const volVal = parseFloat(volatility);
  
  // Calculate sentiment score as drift divided by volatility.
  // (If volatility is zero, default the score to 0.)
  let sentimentScore = volVal === 0 ? 0 : driftVal / volVal;
  
  let sentiment = "";
  let color = "";
  
  // Define sentiment based on score thresholds.
  if (sentimentScore <= -1.0) {
    sentiment = "Very Bearish";
    color = "#8B0000"; // Dark Red
  } else if (sentimentScore <= -0.3) {
    sentiment = "Bearish";
    color = "red";
  } else if (sentimentScore < 0) {
    sentiment = "Slightly Bearish";
    color = "orangered";
  } else if (sentimentScore < 0.05) {
    sentiment = "Neutral";
    color = "gray";
  } else if (sentimentScore < 0.2) {
    sentiment = "Slightly Bullish";
    color = "lightgreen";
  } else if (sentimentScore < 0.5) {
    sentiment = "Bullish";
    color = "green";
  } else {
    sentiment = "Very Bullish";
    color = "darkgreen";
  }
  
  // Styling for the container.
  const containerStyle = {
    border: darkMode ? '1px solid #444' : '1px solid #ddd',
    padding: '10px',
    borderRadius: '5px',
    backgroundColor: darkMode ? '#333' : '#f9f9f9',
    color: darkMode ? '#eee' : '#333',
    marginTop: '20px',
    textAlign: 'center'
  };

  const sentimentStyle = {
    fontWeight: 'bold',
    color: color,
    fontSize: '1.2rem'
  };

  return (
    <div style={containerStyle}>
      <h3>Market Sentiment</h3>
      <p style={sentimentStyle}>{sentiment}</p>
      <p style={{ fontSize: '0.9rem' }}>
        Drift: {drift}% | Volatility: {volatility}% | Score: {sentimentScore.toFixed(2)}
      </p>
    </div>
  );
};

export default MarketSentimentMeter;
              