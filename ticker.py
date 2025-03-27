import os
import json

folder = "public/data"
tickers = []

for filename in os.listdir(folder):
    if filename.endswith("_full.csv"):
        ticker = filename.replace("_full.csv", "")
        tickers.append(ticker)

with open(os.path.join(folder, "tickers.json"), "w") as f:
    json.dump(sorted(tickers), f)

