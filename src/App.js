import React, { useState, useEffect, useRef } from 'react';
import { Chart, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Portfolio from './components/Portfolio';
import TradeControls from './components/TradeControls';
import MarketSentimentMeter from './components/MarketSentimentMeter';
import TradingSimulation from './components/TradingSimulation';
import StockDashboard from './components/StockDashboard';

// Register Chart.js components
Chart.register(LineElement, CategoryScale, LinearScale, PointElement);

const App = () => {
  const stockName = "AI $SPY";
  const [startDate, setStartDate] = useState(new Date('2025-01-01'));
  const [holdings, setHoldings] = useState({});
  const [cash, setCash] = useState(10000);
  const [simulationData, setSimulationData] = useState([]);
  const [simulationParams, setSimulationParams] = useState({});
  const [lastShock, setLastShock] = useState(0);
  const [variableMode, setVariableMode] = useState("random");
  const [revealed, setRevealed] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [timeFrame, setTimeFrame] = useState("ALL");
  const [dataSource, setDataSource] = useState("random"); // "random" or "real"
  const [selectedTicker, setSelectedTicker] = useState("AAPL");
  const [availableTickers, setAvailableTickers] = useState([])
  useEffect(() => {
    fetch('/data/tickers.json')
      .then((res) => res.json())
      .then((tickers) => setAvailableTickers(tickers));
  }, []);
  const [initialPrice, setInitialPrice] = useState(null);

useEffect(() => {
  if (simulationData[0]?.length > 0 && !initialPrice) {
    setInitialPrice(simulationData[0][0]);
  }
}, [simulationData, initialPrice]);
const [aiHoldings, setAiHoldings] = useState({});
const [aiCash, setAiCash] = useState(10000);
const [showAI, setShowAI] = useState(true);
const [aiStrategy, setAiStrategy] = useState('crossover');
const [liveMode, setLiveMode] = useState(false);
const [portfolioHistory, setPortfolioHistory] = useState([]);
const [aiActionPending, setAiActionPending] = useState(null);
const playerStock = holdings[stockName]?.shares || 0;
const playerAvg = holdings[stockName]?.avgPrice || 0;

const currentSim = simulationData[0] || [];
const currentPrice = currentSim.length > 0 ? currentSim[currentSim.length - 1] : 1;

const playerValue = playerStock * currentPrice;
const playerNetWorth = cash + playerValue;
const playerGain = ((playerNetWorth - 10000) / 10000) * 100;

const aiStock = aiHoldings[stockName]?.shares || 0;
const aiValue = aiStock * currentPrice;
const aiNetWorth = aiCash + aiValue;
const aiGain = ((aiNetWorth - 10000) / 10000) * 100;

const firstPrice = simulationData[0]?.[0] || 1;
const buyHoldShares = Math.floor(10000 / firstPrice);
const buyHoldValue = buyHoldShares * currentPrice;
const buyHoldGain = ((buyHoldValue - 10000) / 10000) * 100;



  const handleBuy = (qty) => {
    const cost = currentPrice * qty;
    if (cash >= cost) {
      setCash(prev => prev - cost);
      setHoldings(prev => {
        const prevShares = prev[stockName]?.shares || 0;
        const prevTotalCost = prevShares * (prev[stockName]?.avgPrice || 0);
        const newTotalCost = prevTotalCost + cost;
        const newShares = prevShares + qty;
        const newAvgPrice = newTotalCost / newShares;
        return {
          ...prev,
          [stockName]: { shares: newShares, avgPrice: newAvgPrice }
        };
      });
    } else {
      alert("Not enough cash!");
    }
  };

  const handleBuyAll = () => {
    const maxQty = Math.floor(cash / currentPrice);
    if (maxQty > 0) {
      handleBuy(maxQty);
    } else {
      alert("Not enough cash to buy any shares!");
    }
  };

  const handleSell = (qty) => {
    const owned = holdings[stockName]?.shares || 0;
    const sellQty = Math.min(qty, owned);
    if (sellQty > 0) {
      const revenue = sellQty * currentPrice;
      setCash(prev => prev + revenue);
      setHoldings(prev => {
        const remaining = owned - sellQty;
        if (remaining <= 0) {
          const { [stockName]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [stockName]: { ...prev[stockName], shares: remaining } };
        }
      });
    }
  };

  const handleSellAll = () => {
    const qty = holdings[stockName]?.shares || 0;
    handleSell(qty);
  };

  // ⬇️ INSERT AI TRADING BOT CODE HERE (from canvas)
  // ✅ AI Bot State & Strategy Hook + Enhancements


const getBoxStyle = (darkMode) => ({
  border: darkMode ? '1px solid #444' : '1px solid #ddd',
  padding: '10px',
  borderRadius: '5px',
  backgroundColor: darkMode ? '#333' : '#f9f9f9',
  color: darkMode ? '#eee' : '#333',
  marginTop: '20px'
});

// Inside App() component
const aiTradeLog = useRef([]); // Persistent log
const [aiBuyFraction, setAiBuyFraction] = useState(1); // range 0.01 to 1
const [aiSellFraction, setAiSellFraction] = useState(1); // range 0.01 to 1
const confirmAiTrade = () => {
  if (!aiActionPending) return;
  const aiShares = aiHoldings[stockName]?.shares || 0;

  if (aiActionPending === 'BUY' && aiCash >= currentPrice) {
    const qty = Math.floor((aiCash * aiBuyFraction) / currentPrice);
    if (qty > 0) {
      setAiCash(prev => prev - qty * currentPrice);
      setAiHoldings(prev => {
        const prevShares = prev[stockName]?.shares || 0;
        const prevTotalCost = prevShares * (prev[stockName]?.avgPrice || 0);
        const newShares = prevShares + qty;
        const newTotalCost = prevTotalCost + qty * currentPrice;
        const newAvg = newTotalCost / newShares;
        return {
          ...prev,
          [stockName]: { shares: newShares, avgPrice: newAvg }
        };
      });
      aiTradeLog.current.push(`🤖 AI BUY ${qty} @ $${currentPrice.toFixed(2)}`);
    }
  } else if (aiActionPending === 'SELL' && aiShares > 0) {
    const qty = Math.floor(aiShares * aiSellFraction);
    if (qty > 0) {
      setAiCash(prev => prev + qty * currentPrice);
      setAiHoldings(prev => {
        const remaining = aiShares - qty;
        if (remaining <= 0) {
          const { [stockName]: _, ...rest } = prev;
          return rest;
        } else {
          return { ...prev, [stockName]: { ...prev[stockName], shares: remaining } };
        }
      });
      aiTradeLog.current.push(`🤖 AI SELL ${qty} @ $${currentPrice.toFixed(2)}`);
    }
  }

  setAiActionPending(null);
};


// Configurable moving averages
const shortWindow = 5;
const longWindow = 20;

useEffect(() => {
  if (!showAI || !currentSim || currentSim.length < longWindow) return;

  const shortAvg = currentSim.slice(-shortWindow).reduce((a, b) => a + b, 0) / shortWindow;
  const longAvg = currentSim.slice(-longWindow).reduce((a, b) => a + b, 0) / longWindow;

  const aiShares = aiHoldings[stockName]?.shares || 0;

  if (aiStrategy === 'crossover') {
    if (shortAvg > longAvg && aiCash >= currentPrice) {
      const qty = Math.floor((aiCash * aiBuyFraction) / currentPrice);
      if (qty > 0) {
        setAiCash(prev => prev - qty * currentPrice);
        setAiHoldings(prev => {
          const prevShares = prev[stockName]?.shares || 0;
          const prevTotalCost = prevShares * (prev[stockName]?.avgPrice || 0);
          const newShares = prevShares + qty;
          const newTotalCost = prevTotalCost + qty * currentPrice;
          const newAvg = newTotalCost / newShares;
          return {
            ...prev,
            [stockName]: { shares: newShares, avgPrice: newAvg }
          };
        });
        aiTradeLog.current.push(`🤖 AI BUY ${qty} @ $${currentPrice.toFixed(2)}`);
      }
    } else if (shortAvg < longAvg && aiShares > 0) {
      const qty = Math.floor(aiShares * aiSellFraction);
      if (qty > 0) {
        setAiCash(prev => prev + qty * currentPrice);
        setAiHoldings(prev => {
          const remaining = aiShares - qty;
          if (remaining <= 0) {
            const { [stockName]: _, ...rest } = prev;
            return rest;
          } else {
            return { ...prev, [stockName]: { ...prev[stockName], shares: remaining } };
          }
        });
        aiTradeLog.current.push(`🤖 AI SELL ${qty} @ $${currentPrice.toFixed(2)}`);
      }
    }
  }
}, [currentSim, showAI, aiStrategy, aiBuyFraction, aiSellFraction]);

useEffect(() => {
  const aiQty = aiHoldings[stockName]?.shares || 0;
  const aiAvg = aiHoldings[stockName]?.avgPrice || 0;
  const aiValue = aiQty * currentPrice;
  setPortfolioHistory(prev => [...prev.slice(-99), aiCash + aiValue]);
}, [aiHoldings, aiCash, currentPrice]);

const renderAiPortfolio = () => {
  const aiQty = aiHoldings[stockName]?.shares || 0;
  const aiAvg = aiHoldings[stockName]?.avgPrice || 0;
  const aiValue = aiQty * currentPrice;
  const pl = (currentPrice - aiAvg) * aiQty;
  return (
    <div style={getBoxStyle(darkMode)}>
      <h3>🤖 AI Portfolio</h3>
      <p><strong>💰 Cash:</strong> ${aiCash.toFixed(2)}</p>
      <p><strong>📈 Stock Value:</strong> ${aiValue.toFixed(2)}</p>
      <p><strong>🧮 Net Worth:</strong> ${(aiCash + aiValue).toFixed(2)}</p>
      {aiQty > 0 && (
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
            <tr>
              <td>{stockName}</td>
              <td align="right">{aiQty}</td>
              <td align="right">${aiAvg.toFixed(2)}</td>
              <td align="right">${currentPrice.toFixed(2)}</td>
              <td align="right" style={{ color: pl >= 0 ? 'green' : 'red' }}>${pl.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

const renderAiTradeLog = () => (
  <div style={getBoxStyle(darkMode)}>
    <h3>📝 AI Trade Log</h3>
    <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.9rem' }}>
      {aiTradeLog.current.length === 0 ? (
        <p>No trades yet.</p>
      ) : (
        <ul style={{ paddingLeft: '20px' }}>
          {aiTradeLog.current.slice().reverse().map((log, i) => (
            <li key={i}>{log}</li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

const renderAIModeControls = () => (
  <div style={getBoxStyle(darkMode)}>
    <h3>⚙️ AI Settings</h3>
    <label>
      <input type="checkbox" checked={showAI} onChange={() => setShowAI(!showAI)} /> Enable AI
    </label>
    <br />
    <label>
      <input type="checkbox" checked={liveMode} onChange={() => setLiveMode(!liveMode)} /> Live Market Mode
    </label>
    <br />
    <label>Strategy: </label>
    <select value={aiStrategy} onChange={e => setAiStrategy(e.target.value)}>
      <option value="crossover">Moving Average Crossover</option>
      <option value="momentum">Momentum (Coming Soon)</option>
      <option value="meanreversion">Mean Reversion (Coming Soon)</option>
    </select>
    <br />
    <label>Buy Fraction: {Math.round(aiBuyFraction * 100)}%</label>
    <input type="range" min="0.01" max="1" step="0.01" value={aiBuyFraction} onChange={e => setAiBuyFraction(parseFloat(e.target.value))} />
    <br />
    <label>Sell Fraction: {Math.round(aiSellFraction * 100)}%</label>
    <input type="range" min="0.01" max="1" step="0.01" value={aiSellFraction} onChange={e => setAiSellFraction(parseFloat(e.target.value))} />
  </div>
);


  return (
    <div style={{ backgroundColor: darkMode ? '#222' : '#fff', color: darkMode ? '#eee' : '#333', minHeight: '100vh' }}>
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <button onClick={() => setDarkMode(!darkMode)} style={{
            backgroundColor: darkMode ? '#444' : '#ddd',
            color: darkMode ? '#fff' : '#333',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '5px'
          }}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label><strong>Data Source: </strong></label>
          <select value={dataSource} onChange={(e) => setDataSource(e.target.value)}>
            <option value="random">Simulated (Random Walk)</option>
            <option value="real">Historical (SPY 5Y)</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label><strong>Select Stock: </strong></label>
          <select value={selectedTicker} onChange={(e) => setSelectedTicker(e.target.value)}>
            {availableTickers.map((ticker) => (
              <option key={ticker} value={ticker}>{ticker}</option>
            ))}
          </select>
          <button onClick={() => {
            const randomTicker = availableTickers[Math.floor(Math.random() * availableTickers.length)];
            setSelectedTicker(randomTicker);
          }}>
            🎲 Random Ticker
          </button>
        </div>


        <StockDashboard
          simulationData={simulationData}
          startDate={startDate}
          timeFrame={timeFrame}
          darkMode={darkMode}
        />
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        margin: '0 auto',
        padding: '20px',
        maxWidth: '1200px',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ width: '350px', marginRight: '20px', flexShrink: 0 }}>
          <Portfolio
            holdings={holdings}
            cash={cash}
            currentPrices={{ [stockName]: currentPrice }}
            darkMode={darkMode}
          />
          <div style={getBoxStyle(darkMode)}>
            <h3>📊 Performance Summary</h3>
{`📊 Player Gain: `}<span style={{ color: playerGain >= 0 ? "green" : "red" }}>{playerGain.toFixed(2)}%</span>
{`🤖 AI Gain: `}<span style={{ color: aiGain >= 0 ? "green" : "red" }}>{aiGain.toFixed(2)}%</span>
            <p><strong>Buy & Hold (SPY):</strong> {buyHoldGain.toFixed(2)}%</p>
          </div>
          <TradeControls
            stockName={stockName}
            currentPrice={currentPrice}
            onBuyAll={handleBuyAll}
            onSellAll={handleSellAll}
            darkMode={darkMode}
            aiBuyFraction={aiBuyFraction}
            aiSellFraction={aiSellFraction}
            setAiBuyFraction={setAiBuyFraction}
            setAiSellFraction={setAiSellFraction}
            aiActionPending={aiActionPending}
            confirmAiTrade={confirmAiTrade}
          />

          <MarketSentimentMeter
            drift={simulationParams.drift || "0"}
            volatility={simulationParams.volatility || "0"}
            darkMode={darkMode}
          />
          {renderAiPortfolio()}
          {renderAiTradeLog()}
          {renderAIModeControls()}
        </div>
       
        <div style={{ flex: 1 }}>
          <TradingSimulation
            dataSource={dataSource}
            onUpdateData={setSimulationData}
            onSimulationParams={setSimulationParams}
            onUpdateLastShock={setLastShock}
            variableMode={variableMode}
            selectedTicker={selectedTicker}
            onVariableModeChange={(mode) => { setVariableMode(mode); setRevealed(false); }}
            darkMode={darkMode}
          />
        </div>
        
      </div>
    </div>
    
  );
};

export default App;