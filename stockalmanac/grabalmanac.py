import yfinance as yf
import pandas as pd
import time
import os

# Create output folder
os.makedirs('public/data', exist_ok=True)

# Step 1: Load current S&P 500 tickers from Wikipedia
wiki_url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
df = pd.read_html(wiki_url, header=0)[0]
tickers = df['Symbol'].str.replace('.', '-', regex=False).tolist()

# Step 2: Download historical data
for i, ticker in enumerate(tickers):
    print(f"({i+1}/{len(tickers)}) Downloading {ticker}...")
    try:
        data = yf.download(ticker, start='1980-01-01', progress=False)
        if not data.empty:
            data[['Close']].to_csv(f'public/data/{ticker}_full.csv')
            time.sleep(0.5)  # avoid hitting API limits
    except Exception as e:
        print(f"Failed to download {ticker}: {e}")

