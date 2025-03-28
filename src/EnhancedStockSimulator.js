import React, { useState, useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

// Utility: Calculate Simple Moving Average (SMA)
const calculateSMA = (data, period) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: null });
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, pt) => sum + pt.price, 0) / period;
      result.push({ time: data[i].time, value: Math.round(avg * 100) / 100 });
    }
  }
  return result;
};

const EnhancedStockSimulator = ({ botMode = "simple" }) => {
  // ---------------------
  // Mode & Data States
  // ---------------------
  const [mode, setMode] = useState(null); // "simulated" or "real"
  const [stockData, setStockData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(0);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);

  // ---------------------
  // Trading & Performance States
  // ---------------------
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

  // ---------------------
  // Refs for Charting and Simulation Loop
  // ---------------------
  const mainChartRef = useRef(null);
  const priceSeriesRef = useRef(null);
  const smaSeriesRef = useRef(null);
  const performanceChartRef = useRef(null);
  const botSeriesRef = useRef(null);
  const holdSeriesRef = useRef(null);
  const animationFrameId = useRef(null);
  const lastTickRef = useRef(Date.now());
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // ---------------------
  // Reset charts and simulation state on mode change
  // ---------------------
  useEffect(() => {
    if (mainChartRef.current) {
      mainChartRef.current.remove();
      mainChartRef.current = null;
      priceSeriesRef.current = null;
      smaSeriesRef.current = null;
    }
    if (performanceChartRef.current) {
      performanceChartRef.current.remove();
      performanceChartRef.current = null;
      botSeriesRef.current = null;
      holdSeriesRef.current = null;
    }
    setTime(0);
    setPerformanceHistory([]);
    setTrades([]);
    setNotifications([]);
    // Default speed: higher for simulated mode
    if (mode === "simulated") {
      setSpeed(10);
    } else {
      setSpeed(1);
    }
  }, [mode]);

  // ---------------------
  // Fetch available tickers (for real mode)
  // ---------------------
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

  // ---------------------
  // Load or generate stock data
  // ---------------------
  useEffect(() => {
    const loadData = async () => {
      if (mode === "real") {
        try {
          const res = await fetch(`/data/${selectedTicker}_full.csv`);
          const text = await res.text();
          const rows = text.trim().split("\n").slice(1);
          const parsed = rows.map((row, i) => {
            const cols = row.split(",");
            return { time: i, price: parseFloat(cols[4]) }; // use Close price
          });
          const limited = parsed.slice(0, 500);
          setStockData(limited);
          setDataLoaded(parsed.length);
          setTime(0);
        } catch (error) {
          console.error(error);
        }
      } else if (mode === "simulated") {
        // Generate simulated random walk data
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

  // ---------------------
  // Initialize Buy & Hold (only once based on first price)
  // ---------------------
  useEffect(() => {
    if (stockData.length > 0 && buyAndHoldShares === 0) {
      const initial = stockData[0].price;
      const shares = Math.floor(10000 / initial);
      setBuyAndHoldShares(shares);
      setBuyAndHoldCash(10000 - shares * initial);
    }
  }, [stockData, buyAndHoldShares]);

  // ---------------------
  // Create Main Stock Chart
  // ---------------------
  useEffect(() => {
    if (stockData.length === 0) return;
    if (mainChartRef.current) return; // create only once per mode
    const container = document.getElementById("chart-container-sim");
    if (!container) return;
    mainChartRef.current = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: { backgroundColor: "#111", textColor: "#DDD" },
      grid: { vertLines: { color: "#333" }, horzLines: { color: "#333" } },
      rightPriceScale: { borderColor: "#71649C" },
      timeScale: {
        borderColor: "#71649C",
        timeVisible: true,
        tickMarkFormatter: (time) => `Tick ${time}`,
      },
      handleScroll: true,
      handleScale: true,
    });
    const lineColor = mode === "simulated" ? "#FFD700" : "#10b981";
    priceSeriesRef.current = mainChartRef.current.addLineSeries({ color: lineColor });
    if (mode !== "simulated") {
      smaSeriesRef.current = mainChartRef.current.addLineSeries({
        color: "#6366f1",
        lineWidth: 1,
      });
    }
  }, [stockData, mode]);

  // Update Main Chart on each tick
  useEffect(() => {
    if (!priceSeriesRef.current || stockData.length === 0) return;
    const filteredData = stockData.slice(0, time + 1).map((pt) => ({
      time: pt.time,
      value:
        volatilityEvent && mode === "simulated"
          ? pt.price * volatilityEvent.multiplier
          : pt.price,
    }));
    priceSeriesRef.current.setData(filteredData);
    if (smaSeriesRef.current && mode !== "simulated") {
      const smaData = calculateSMA(stockData, 10);
      const smaFiltered = smaData.filter((pt) => pt.time <= time && pt.value !== null);
      smaSeriesRef.current.setData(smaFiltered);
    }
  }, [time, stockData, volatilityEvent, mode]);

  // ---------------------
  // Create Performance Chart (Net Worth)
  // ---------------------
  useEffect(() => {
    if (performanceHistory.length === 0) return;
    if (performanceChartRef.current) return;
    const container = document.getElementById("performance-chart");
    if (!container) return;
    performanceChartRef.current = createChart(container, {
      width: container.clientWidth,
      height: 200,
      layout: { backgroundColor: "#111", textColor: "#DDD" },
      grid: { vertLines: { color: "#333" }, horzLines: { color: "#333" } },
      priceScale: { autoScale: true },
      timeScale: {
        borderColor: "#71649C",
        timeVisible: true,
        tickMarkFormatter: (time) => `Tick ${time}`,
      },
      handleScroll: true,
      handleScale: true,
    });
    botSeriesRef.current = performanceChartRef.current.addLineSeries({
      color: "#10b981",
    });
    holdSeriesRef.current = performanceChartRef.current.addLineSeries({
      color: "#6366f1",
    });
  }, [performanceHistory]);

  // Update Performance Chart Data
  useEffect(() => {
    if (!botSeriesRef.current || !holdSeriesRef.current) return;
    if (performanceHistory.length === 0) return;
    botSeriesRef.current.setData(
      performanceHistory.map((pt) => ({ time: pt.time, value: pt.botNetWorth }))
    );
    holdSeriesRef.current.setData(
      performanceHistory.map((pt) => ({
        time: pt.time,
        value: pt.buyHoldNetWorth,
      }))
    );
  }, [performanceHistory]);

  // ---------------------
  // Simulation Loop & Trading Logic
  // ---------------------
  useEffect(() => {
    if (stockData.length === 0 || time >= stockData.length) return;
    const basePrice = stockData[time].price;
    const currentPrice =
      volatilityEvent && mode === "simulated"
        ? basePrice * volatilityEvent.multiplier
        : basePrice;
    const botNetWorth = botCash + botShares * currentPrice;
    const buyHoldNetWorth = buyAndHoldCash + buyAndHoldShares * currentPrice;
    setPerformanceHistory((prev) => [
      ...prev,
      { time, botNetWorth, buyHoldNetWorth },
    ]);

    // In real mode, run AI trade logic based on SMA
    if (mode !== "simulated") {
      const smaData = calculateSMA(stockData, 10);
      const filtered = stockData.slice(0, time + 1);
      const lastIdx = filtered.length - 1;
      if (lastIdx >= 10) {
        const currentSMA = smaData[lastIdx]?.value;
        if (currentSMA) {
          if (currentPrice > currentSMA) {
            const sharesToBuy =
              botMode === "max" ? Math.floor(botCash / currentPrice) : 1;
            if (sharesToBuy > 0) {
              setBotCash((prev) => prev - sharesToBuy * currentPrice);
              setBotShares((prev) => prev + sharesToBuy);
              const trade = { type: "buy", shares: sharesToBuy, price: currentPrice, time };
              setTrades((prev) => [...prev, trade]);
              setNotifications((prev) => [
                ...prev,
                `AI bought ${sharesToBuy} at $${currentPrice.toFixed(2)}!`,
              ]);
            }
          } else if (currentPrice < currentSMA) {
            const sharesToSell =
              botMode === "max" ? botShares : botShares > 0 ? 1 : 0;
            if (sharesToSell > 0) {
              setBotCash((prev) => prev + sharesToSell * currentPrice);
              setBotShares((prev) => prev - sharesToSell);
              const trade = { type: "sell", shares: sharesToSell, price: currentPrice, time };
              setTrades((prev) => [...prev, trade]);
              setNotifications((prev) => [
                ...prev,
                `AI sold ${sharesToSell} at $${currentPrice.toFixed(2)}!`,
              ]);
            }
          }
        }
      }
    }

    // In simulated mode, randomly trigger volatility events (5% chance per tick)
    if (mode === "simulated" && Math.random() < 0.05) {
      const isSpike = Math.random() < 0.5;
      const multiplier = isSpike ? 1 + Math.random() * 0.5 : 1 - Math.random() * 0.5;
      setVolatilityEvent({
        message: isSpike ? "⚡ Volatility Spike!" : "⚡ Volatility Crash!",
        multiplier,
      });
      setTimeout(() => setVolatilityEvent(null), 1000);
    }
  }, [time]);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => setNotifications([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // ---------------------
  // Simulation Loop using requestAnimationFrame
  // ---------------------
  const simulationLoop = () => {
    if (!runningRef.current) return;
    const now = Date.now();
    if (now - lastTickRef.current >= 1000 / speed) {
      lastTickRef.current = now;
      setTime((prev) => {
        if (prev >= stockData.length - 1) {
          setRunning(false);
          return prev;
        }
        return prev + 1;
      });
    }
    animationFrameId.current = requestAnimationFrame(simulationLoop);
  };

  const togglePlay = () => {
    if (running) {
      setRunning(false);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    } else {
      setRunning(true);
      lastTickRef.current = Date.now();
      simulationLoop();
    }
  };

  // ---------------------
  // Manual Trading Handlers
  // ---------------------
  const basePrice = stockData.length > 0 ? stockData[time].price : 0;
  const currentPrice =
    volatilityEvent && mode === "simulated"
      ? basePrice * volatilityEvent.multiplier
      : basePrice;
  const handleManualBuy = () => {
    if (manualTradeQty <= 0) return;
    const cost = manualTradeQty * currentPrice;
    if (botCash >= cost) {
      setBotCash((prev) => prev - cost);
      setBotShares((prev) => prev + manualTradeQty);
      const trade = { type: "buy", shares: manualTradeQty, price: currentPrice, time };
      setTrades((prev) => [...prev, trade]);
      setNotifications((prev) => [
        ...prev,
        `Manually bought ${manualTradeQty} at $${currentPrice.toFixed(2)}!`,
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
      const revenue = manualTradeQty * currentPrice;
      setBotCash((prev) => prev + revenue);
      setBotShares((prev) => prev - manualTradeQty);
      const trade = { type: "sell", shares: manualTradeQty, price: currentPrice, time };
      setTrades((prev) => [...prev, trade]);
      setNotifications((prev) => [
        ...prev,
        `Manually sold ${manualTradeQty} at $${currentPrice.toFixed(2)}!`,
      ]);
    } else {
      setNotifications((prev) => [
        ...prev,
        `Not enough shares to sell ${manualTradeQty}!`,
      ]);
    }
  };

  // ---------------------
  // Compute Net Worth for Display
  // ---------------------
  const botNetWorth = botCash + botShares * currentPrice;
  const buyHoldNetWorth = buyAndHoldCash + buyAndHoldShares * currentPrice;
  const botPnL = botNetWorth - 10000;
  const holdPnL = buyHoldNetWorth - 10000;

  // ---------------------
  // Render the UI
  // ---------------------
  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h2 className="text-3xl font-bold mb-4 text-center">Enhanced Stock Simulator</h2>

      {/* Mode Selection */}
      {!mode ? (
        <div className="text-center">
          <p className="mb-4 text-xl">Choose Simulation Mode:</p>
          <button
            onClick={() => setMode("simulated")}
            className="bg-green-600 px-6 py-3 m-2 rounded hover:bg-green-500 transition-colors"
          >
            🧪 Simulated Data
          </button>
          <button
            onClick={() => setMode("real")}
            className="bg-blue-600 px-6 py-3 m-2 rounded hover:bg-blue-500 transition-colors"
          >
            📈 Real Historical Data
          </button>
        </div>
      ) : (
        <>
          {/* Top Panel: Info & Controls */}
          <div className="mb-4 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-2 md:mb-0">
              <p className="text-sm italic text-gray-400">
                Mode: {mode === "simulated" ? "Simulated" : "Real"}
              </p>
              <p className="text-sm italic text-gray-400">
                Bot Shares: {botShares} | Bot Cash: ${botCash.toFixed(2)}
              </p>
              <p className="text-sm italic text-gray-400">
                Buy & Hold Shares: {buyAndHoldShares} | Buy & Hold Cash: ${buyAndHoldCash.toFixed(2)}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={togglePlay}
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-500 transition-colors"
              >
                {running ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => setMode(null)}
                className="bg-red-700 px-3 py-1 rounded hover:bg-red-600 transition-colors"
              >
                🔄 Reset
              </button>
              <button className="bg-purple-600 px-3 py-1 rounded hover:bg-purple-500 transition-colors">
                Python Strategy Lab
              </button>
            </div>
          </div>

          {/* Stock Selector for Real Mode */}
          {mode === "real" && (
            <div className="mt-4 text-center">
              <label className="mr-2">Select Stock:</label>
              <select
                onChange={(e) => setSelectedTicker(e.target.value)}
                value={selectedTicker}
                className="bg-gray-800 text-white px-4 py-2 rounded"
              >
                {availableTickers.map((ticker) => (
                  <option key={ticker} value={ticker}>
                    {ticker}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-2 text-center text-sm">{dataLoaded} Prices Loaded</div>

          {/* Main Stock Chart */}
          <div id="chart-container-sim" className="rounded border border-gray-700 my-4" />

          {/* Performance Chart */}
          <div id="performance-chart" className="rounded border border-gray-700 my-4" />

          {/* Manual Trading Panel */}
          <div className="mt-4 p-4 bg-gray-800 rounded">
            <h3 className="text-2xl font-bold mb-2">Manual Trade</h3>
            <div className="flex space-x-4 items-center">
              <input
                type="number"
                value={manualTradeQty}
                onChange={(e) => setManualTradeQty(Number(e.target.value))}
                className="bg-gray-700 text-white px-2 py-1 rounded w-20"
                placeholder="Qty"
              />
              <button
                onClick={handleManualBuy}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 transition-colors"
              >
                Buy
              </button>
              <button
                onClick={handleManualSell}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-500 transition-colors"
              >
                Sell
              </button>
            </div>
          </div>

          {/* Floating Notifications */}
          <div className="fixed top-10 right-10 space-y-2">
            {notifications.map((note, idx) => (
              <div
                key={idx}
                className="bg-gray-800 px-4 py-2 rounded shadow-lg transition-all duration-500"
              >
                {note}
              </div>
            ))}
          </div>

          {/* AI Trades Side Panel */}
          <div className="fixed bottom-10 left-10 bg-gray-800 p-4 rounded shadow-lg max-h-64 overflow-y-auto">
            <h4 className="font-bold mb-2">AI Trades</h4>
            {trades.map((trade, idx) => (
              <div key={idx} className="text-sm mb-1">
                {trade.type === "buy" ? "Bought" : "Sold"} {trade.shares} at $
                {trade.price.toFixed(2)} (t={trade.time})
              </div>
            ))}
          </div>

          {/* Volatility Notification */}
          {volatilityEvent && (
            <div className="fixed top-10 left-10 bg-yellow-600 px-4 py-2 rounded shadow-lg">
              {volatilityEvent.message}
            </div>
          )}

          {/* Speed Control */}
          <div className="mt-4 flex justify-center items-center">
            <label className="mr-2">Speed:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="ml-2"
            />
            <span className="ml-2">{speed}x</span>
          </div>

          {/* Net Worth Display */}
          <div className="mt-4 text-center">
            <div
              className={`text-3xl font-bold ${
                botPnL >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              Bot Net Worth: ${botNetWorth.toFixed(2)}
            </div>
            <div
              className={`text-3xl font-bold mt-2 ${
                holdPnL >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              Buy & Hold Net Worth: ${buyHoldNetWorth.toFixed(2)}
            </div>
            <div className="mt-2 text-sm italic">
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

export default EnhancedStockSimulator;
