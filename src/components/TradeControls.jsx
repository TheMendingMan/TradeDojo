const TradeControls = ({
  stockName,
  currentPrice,
  onBuyAll,
  onSellAll,
  darkMode,
  aiBuyFraction,
  aiSellFraction,
  setAiBuyFraction,
  setAiSellFraction,
  aiActionPending,
  confirmAiTrade
}) => {
  const controlStyle = {
    border: darkMode ? '1px solid #444' : '1px solid #ddd',
    padding: '10px',
    borderRadius: '5px',
    backgroundColor: darkMode ? '#333' : '#f9f9f9',
    color: darkMode ? '#eee' : '#333',
    marginTop: '20px'
  };

  return (
    <div style={controlStyle}>
      <h3>🛒 Trade Controls</h3>
      <p><strong>{stockName}</strong> – Current Price: ${currentPrice.toFixed(2)}</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button onClick={onBuyAll}>Buy All</button>
        <button onClick={onSellAll}>Sell All</button>
      </div>

      <hr style={{ margin: '10px 0' }} />

      <h4>🤖 AI Controls</h4>
      <label>Buy Fraction: {Math.round(aiBuyFraction * 100)}%</label>
      <input type="range" min="0.01" max="1" step="0.01" value={aiBuyFraction}
             onChange={e => setAiBuyFraction(parseFloat(e.target.value))} />
      <br />
      <label>Sell Fraction: {Math.round(aiSellFraction * 100)}%</label>
      <input type="range" min="0.01" max="1" step="0.01" value={aiSellFraction}
             onChange={e => setAiSellFraction(parseFloat(e.target.value))} />
      {aiActionPending && (
        <button onClick={confirmAiTrade} style={{ marginTop: '10px' }}>
          Confirm {aiActionPending}
        </button>
      )}
    </div>
  );
};

export default TradeControls;