import React from 'react';

const Portfolio = ({ holdings, cash, currentPrices, darkMode }) => {
  const boxStyle = {
    border: darkMode ? '1px solid #444' : '1px solid #ddd',
    padding: '10px',
    borderRadius: '5px',
    backgroundColor: darkMode ? '#333' : '#f9f9f9',
    color: darkMode ? '#eee' : '#333',
    marginTop: '20px'
  };

  const totalStockValue = Object.keys(holdings).reduce((sum, stock) => {
    const quantity = holdings[stock]?.shares || 0;
    const price = currentPrices[stock] || 0;
    return sum + quantity * price;
  }, 0);

  const totalValue = cash + totalStockValue;

  return (
    <div style={boxStyle}>
      <h3>📊 Portfolio</h3>
      <p><strong>💰 Cash:</strong> ${cash.toFixed(2)}</p>
      <p><strong>📈 Stock Value:</strong> ${totalStockValue.toFixed(2)}</p>
      <p><strong>🧮 Net Worth:</strong> ${totalValue.toFixed(2)}</p>
      {Object.keys(holdings).length === 0 ? (
        <p>No holdings yet.</p>
      ) : (
        <table style={{ width: '100%', marginTop: '10px', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th align="left">Stock</th>
              <th align="right">Shares</th>
              <th align="right">Avg Buy</th>
              <th align="right">Curr Price</th>
              <th align="right">P/L</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(holdings).map(([stock, data]) => {
              const currPrice = currentPrices[stock] || 0;
              const pl = (currPrice - data.avgPrice) * data.shares;
              const plColor = pl >= 0 ? 'green' : 'red';
              return (
                <tr key={stock}>
                  <td>{stock}</td>
                  <td align="right">{data.shares}</td>
                  <td align="right">${data.avgPrice.toFixed(2)}</td>
                  <td align="right">${currPrice.toFixed(2)}</td>
                  <td align="right" style={{ color: plColor }}>${pl.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Portfolio;
