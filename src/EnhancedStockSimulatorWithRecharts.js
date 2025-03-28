import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Helper: Calculate Simple Moving Average (SMA)
const calculateSMA = (data, period) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, pt) => sum + pt.price, 0) / period;
      result.push(Math.round(avg * 100) / 100);
    }
  }
  return result;
};

const EnhancedStockSimulatorWithRecharts = ({ botMode = "simple" }) => {
  // ----- Mode & Data States -----
  const [mode, setMode] = useState(null); // "simulated" or "real"
  const [stockData, setStockData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(0);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);

  // ----- Trading & Performance States -----
  const [botCash, setBotCash] = useState(10000);
  const [botShares, setBotShares] = useState(0);
  const [buyAndHoldCash, setBuyAndHoldCash] = useState(10000);
  const [buyAndHoldShares, setBuyAndHoldShares] = useState(0);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [trades, setTrades] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [manualTradeQty, setManualTradeQty] = useState(0);
  const [volatilityEvent, setVolatilityEvent] = useState(null);

  // For real mode: ticker selection
  const [availableTickers, setAvailableTickers] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState("AAPL");

  // ----- Simulation Loop Ref -----
  const intervalRef = useRef(null);

  // ----- Reset simulation state on mode change -----
  useEffect(() => {
    setTime(0);
    setPerformanceHistory([]);
    setTrades([]);
    setNotifications([]);
    // Reset trading states:
    setBotCash(10000);
    setBotShares(0);
    setBuyAndHoldCash(10000);
    setBuyAndHoldShares(0);
    // Default speed: higher for simulated mode
    if (mode === "simulated") {
      setSpeed(10);
    } else {
      setSpeed(1);
    }
  }, [mode]);

  // ----- Fetch available tickers (for real mode) -----
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch("/data/tickers.json");
        const tickers = await res.json();
        setAvailableTickers(tickers);
      } catch (error) {
        console.error("Error fetching tickers:", error);
      }
    };
    fetchTickers();
  }, []);

  // ----- Load or Generate Stock Data -----
  useEffect(() => {
    const loadData = async () => {
      if (mode === "real") {
        try {
          const res = await fetch(`/data/${selectedTicker}_full.csv`);
          const csvText = await res.text();
          // Use PapaParse to reliably parse CSV data
          Papa.parse(csvText, {
            header: true,           // or 'false' if your CSV has pivot rows
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              // Adjust 'Close' if your CSV uses a different column name.
              const parsedData = results.data.map((row, index) => ({
                time: index,
                price: row.Close, // or row[1] if no headers
              }));
              const validData = parsedData.filter((pt) => !isNaN(pt.price));
              setStockData(validData.slice(0, 500));
              setDataLoaded(validData.length);
              setTime(0);
            },
            error: (err) => console.error("PapaParse error:", err),
          });
        } catch (error) {
          console.error(error);
        }
      } else if (mode === "simulated") {
        let price = 100;
        const simulated = [];
        for (let i = 0; i < 500; i++) {
          price += (Math.random() - 0.5) * 2;
          simulated.push({ time: i, price: Math.round(price * 100) / 100 });
        }
        setStockData(simulated);
        setDataLoaded(simulated.length);
        setTime(0);
      }
    };
    if (mode) loadData();
  }, [mode, selectedTicker]);

  // ----- Initialize Buy & Hold once -----
  useEffect(() => {
    if (stockData.length > 0 && buyAndHoldShares === 0) {
      const initial = stockData[0].price;
      const shares = Math.floor(10000 / initial);
      setBuyAndHoldShares(shares);
      setBuyAndHoldCash(10000 - shares * initial);
    }
  }, [stockData, buyAndHoldShares]);

  // ----- Simulation Loop -----
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const intervalTime = 1000 / speed;
    intervalRef.current = setInterval(() => {
      setTime((prev) => {
        if (prev < stockData.length - 1) {
          return prev + 1;
        } else {
          setRunning(false);
          clearInterval(intervalRef.current);
          return prev;
        }
      });
    }, intervalTime);
    return () => clearInterval(intervalRef.current);
  }, [running, speed, stockData.length]);

  // ----- Simulation Trading & Performance Logic -----
  useEffect(() => {
    if (stockData.length === 0 || time >= stockData.length) return;
    // Compute current price (apply volatility in simulated mode)
    const basePrice = stockData[time].price;
    const currentPrice =
      volatilityEvent && mode === "simulated"
        ? basePrice * volatilityEvent.multiplier
        : basePrice;
    const botNetWorth = botCash + botShares * currentPrice;
    const buyHoldNetWorth = buyAndHoldCash + buyAndHoldShares * currentPrice;
    setPerformanceHistory((prev) => [...prev, { time, botNetWorth, buyHoldNetWorth }]);

    // In real mode, run simple AI trading based on SMA
    if (mode === "real") {
      const sma = calculateSMA(stockData, 10);
      const smaValue = sma[time];
      if (smaValue !== null) {
        if (currentPrice > smaValue) {
          // Buy 1 share if possible
          if (botCash >= currentPrice) {
            setBotCash((prev) => prev - currentPrice);
            setBotShares((prev) => prev + 1);
            setTrades((prev) => [...prev, { type: "buy", shares: 1, price: currentPrice, time }]);
            setNotifications((prev) => [...prev, `AI bought 1 at $${currentPrice.toFixed(2)}`]);
          }
        } else if (currentPrice < smaValue) {
          // Sell 1 share if available
          if (botShares > 0) {
            setBotCash((prev) => prev + currentPrice);
            setBotShares((prev) => prev - 1);
            setTrades((prev) => [...prev, { type: "sell", shares: 1, price: currentPrice, time }]);
            setNotifications((prev) => [...prev, `AI sold 1 at $${currentPrice.toFixed(2)}`]);
          }
        }
      }
    }

    // In simulated mode, randomly trigger a volatility event (5% chance per tick)
    if (mode === "simulated" && Math.random() < 0.05) {
      const isSpike = Math.random() < 0.5;
      const multiplier = isSpike ? 1 + Math.random() * 0.5 : 1 - Math.random() * 0.5;
      setVolatilityEvent({ message: isSpike ? "⚡ Spike!" : "⚡ Crash!", multiplier });
      setTimeout(() => setVolatilityEvent(null), 1000);
    }
  }, [time]);

  // ----- Auto-dismiss notifications -----
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => setNotifications([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // ----- Compute Current Values for Display -----
  const basePriceDisplay = stockData.length > 0 ? stockData[time].price : 0;
  const currentPriceDisplay =
    volatilityEvent && mode === "simulated"
      ? basePriceDisplay * volatilityEvent.multiplier
      : basePriceDisplay;
  const botNetWorthDisplay = botCash + botShares * currentPriceDisplay;
  const buyHoldNetWorthDisplay = buyAndHoldCash + buyAndHoldShares * currentPriceDisplay;
  const botPnL = botNetWorthDisplay - 10000;
  const holdPnL = buyHoldNetWorthDisplay - 10000;

  // ----- Manual Trading Handlers -----
  const handleManualBuy = () => {
    if (manualTradeQty <= 0) return;
    const cost = manualTradeQty * currentPriceDisplay;
    if (botCash >= cost) {
      setBotCash((prev) => prev - cost);
      setBotShares((prev) => prev + manualTradeQty);
      setTrades((prev) => [...prev, { type: "buy", shares: manualTradeQty, price: currentPriceDisplay, time }]);
      setNotifications((prev) => [
        ...prev,
        `Manually bought ${manualTradeQty} at $${currentPriceDisplay.toFixed(2)}!`,
      ]);
    } else {
      setNotifications((prev) => [
        ...prev,
        `Not enough cash to buy ${manualTradeQty} shares!`,
      ]);
    }
  };

  const handleManualSell = () => {
    if (manualTradeQty <= 0) return;
    if (botShares >= manualTradeQty) {
      const revenue = manualTradeQty * currentPriceDisplay;
      setBotCash((prev) => prev + revenue);
      setBotShares((prev) => prev - manualTradeQty);
      setTrades((prev) => [...prev, { type: "sell", shares: manualTradeQty, price: currentPriceDisplay, time }]);
      setNotifications((prev) => [
        ...prev,
        `Manually sold ${manualTradeQty} at $${currentPriceDisplay.toFixed(2)}!`,
      ]);
    } else {
      setNotifications((prev) => [
        ...prev,
        `Not enough shares to sell ${manualTradeQty}!`,
      ]);
    }
  };

  // ----- Render the UI (Recharts with "monotone" lines, thicker strokes, no animation) -----
  return (
    <div style={{ padding: '20px', backgroundColor: '#111', color: '#DDD', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center' }}>Enhanced Stock Simulator</h1>
      {!mode ? (
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 100 }}>
          <p style={{ fontSize: '1.5em', marginBottom: '20px' }}>Choose Simulation Mode:</p>
          <button
            onClick={() => setMode("simulated")}
            style={{
              margin: '10px',
              padding: '10px 20px',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            🧪 Simulated Data
          </button>
          <button
            onClick={() => setMode("real")}
            style={{
              margin: '10px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              color: '#fff'
            }}
          >
            📈 Real Historical Data
          </button>
        </div>
      ) : (
        <>
          {/* Top Panel: Info & Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px' }}>
              <p>Mode: {mode === "simulated" ? "Simulated" : "Real"}</p>
              <p>Bot Shares: {botShares} | Bot Cash: ${botCash.toFixed(2)}</p>
              <p>Buy & Hold Shares: {buyAndHoldShares} | Buy & Hold Cash: ${buyAndHoldCash.toFixed(2)}</p>
            </div>
            <div>
              <button
                onClick={() => setRunning(!running)}
                style={{
                  marginRight: '10px',
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                {running ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => setMode(null)}
                style={{
                  marginRight: '10px',
                  padding: '10px 20px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                Reset
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#8b5cf6',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                Python Strategy Lab
              </button>
            </div>
          </div>

          {/* Stock Selector for Real Mode */}
          {mode === "real" && (
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <label style={{ marginRight: '10px' }}>Select Stock:</label>
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                style={{
                  padding: '10px',
                  backgroundColor: '#1f2937',
                  color: '#fff',
                  borderRadius: '5px',
                  border: 'none'
                }}
              >
                {availableTickers.map((ticker) => (
                  <option key={ticker} value={ticker}>{ticker}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '10px' }}>{dataLoaded} Prices Loaded</div>

          {/* Main Stock Chart */}
          <div style={{ margin: '20px auto', width: '90%', maxWidth: '800px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stockData.slice(0, time)}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333"
                  // Optional: lighten or remove grid lines for a cleaner look
                  // strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="time"
                  stroke="#DDD"
                  label={{ value: 'Time', position: 'insideBottomRight', offset: 0 }}
                />
                <YAxis
                  stroke="#DDD"
                  domain={['auto', 'auto']}
                  label={{ value: 'Price', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#222', border: 'none', color: '#DDD' }}
                />
                <Legend />
                <Line
                  type="monotone"            // Smooth line
                  dataKey="price"
                  stroke="#FFD700"
                  dot={false}
                  strokeWidth={2}           // Thicker stroke
                  isAnimationActive={false} // Disable Recharts animation
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Chart */}
          <div style={{ margin: '20px auto', width: '90%', maxWidth: '800px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={performanceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="time"
                  stroke="#DDD"
                  label={{ value: 'Time', position: 'insideBottomRight', offset: 0 }}
                />
                <YAxis
                  stroke="#DDD"
                  domain={['auto', 'auto']}
                  label={{ value: 'Net Worth', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#222', border: 'none', color: '#DDD' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="botNetWorth"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  name="AI Bot Net Worth"
                />
                <Line
                  type="monotone"
                  dataKey="buyHoldNetWorth"
                  stroke="#6366f1"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                  name="Buy & Hold Net Worth"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Manual Trading Panel */}
          <div style={{ margin: '20px auto', width: '90%', maxWidth: '600px', padding: '20px', backgroundColor: '#1f2937', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.5em', fontWeight: 'bold', marginBottom: '10px' }}>Manual Trade</h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <input
                type="number"
                value={manualTradeQty}
                onChange={(e) => setManualTradeQty(Number(e.target.value))}
                placeholder="Qty"
                style={{ padding: '10px', width: '80px', marginRight: '10px', borderRadius: '5px', border: 'none', backgroundColor: '#374151', color: '#fff' }}
              />
              <button
                onClick={handleManualBuy}
                style={{ padding: '10px 20px', marginRight: '10px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '5px', cursor: 'pointer', color: '#fff' }}
              >
                Buy
              </button>
              <button
                onClick={handleManualSell}
                style={{ padding: '10px 20px', backgroundColor: '#ef4444', border: 'none', borderRadius: '5px', cursor: 'pointer', color: '#fff' }}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Floating Notifications */}
          <div style={{ position: 'fixed', top: '10px', right: '10px' }}>
            {notifications.map((note, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#1f2937',
                  padding: '10px',
                  marginBottom: '5px',
                  borderRadius: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  transition: 'all 0.5s'
                }}
              >
                {note}
              </div>
            ))}
          </div>

          {/* AI Trades Side Panel */}
          <div
            style={{
              position: 'fixed',
              bottom: '10px',
              left: '10px',
              backgroundColor: '#1f2937',
              padding: '20px',
              borderRadius: '8px',
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            <h4 style={{ fontWeight: 'bold', marginBottom: '10px' }}>AI Trades</h4>
            {trades.map((trade, idx) => (
              <div key={idx} style={{ fontSize: '0.9em', marginBottom: '5px' }}>
                {trade.type === "buy" ? "Bought" : "Sold"} {trade.shares} at $
                {trade.price.toFixed(2)} (t={trade.time})
              </div>
            ))}
          </div>

          {/* Volatility Notification */}
          {volatilityEvent && (
            <div
              style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                backgroundColor: '#f59e0b',
                padding: '10px',
                borderRadius: '5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}
            >
              {volatilityEvent.message}
            </div>
          )}

          {/* Speed Control */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <label style={{ marginRight: '10px' }}>Speed:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ marginRight: '10px' }}
            />
            <span>{speed}x</span>
          </div>

          {/* Net Worth Display */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div
              style={{
                fontSize: '2em',
                fontWeight: 'bold',
                color: botPnL >= 0 ? '#10b981' : '#ef4444'
              }}
            >
              Bot Net Worth: ${botNetWorthDisplay.toFixed(2)}
            </div>
            <div
              style={{
                fontSize: '2em',
                fontWeight: 'bold',
                marginTop: '10px',
                color: holdPnL >= 0 ? '#10b981' : '#ef4444'
              }}
            >
              Buy & Hold Net Worth: ${buyHoldNetWorthDisplay.toFixed(2)}
            </div>
            <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
              Bot PnL: {botPnL >= 0 ? "+" : ""}
              {botPnL.toFixed(2)} | Buy & Hold PnL: {holdPnL >= 0 ? "+" : ""}
              {holdPnL.toFixed(2)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedStockSimulatorWithRecharts;
