import yfinance as yf

ticker = yf.Ticker("SPY")  # or AAPL, TSLA, etc.
hist = ticker.history(period="5y", interval="1d")
hist[['Close']].to_csv("spy_5y_daily.csv")
