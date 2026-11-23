# WDex – Futures Trading (demo)

A perpetual-futures trading web app with demo funds (React + Vite + lightweight-charts).
Prices follow the real market in real time, and an admin panel lets you push the price up or down.

Live: https://wdex-841.netlify.app

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run deploy   # build + deploy to Netlify
```

## Features

- 11 real-time pairs: BTC, ETH, SOL, BNB, DOGE, XRP, ADA, AVAX, LINK, LTC, TRX (public Binance market data)
- Candles from 1s to 4h, indicators MA (7/25/99), EMA (12/26), BOLL (20,2), volume toggle
- Market / Limit / Stop Market orders, Long / Short, 1–125x leverage, isolated margin, reduce-only
- TP/SL (also quick TP/SL by % ROE), size in USDT or coin
- Positions: add/remove margin, flip, close 50% / 100%, ⚠ warning within 1% of liquidation
- Liquidation engine, taker 0.05% / maker 0.02% fees, funding every 8h with countdown
- Order book (click a price to fill a limit order), recent trades
- Price alerts 🔔 (drawn on the chart, with sound), sound toggle 🔊
- History with filters and CSV export, Statistics tab (win rate, profit factor, PnL by symbol, equity curve)
- 10,000 USDT demo account, deposit button, everything saved in localStorage

## 🎛 Price Control

The exchange price = real price × offset factor.

| Control | Effect |
|---|---|
| 🌐 Real price / 📈 Up / 📉 Down | Choose the trend |
| 🎯 Target + "Go" | Price moves gradually to the level you enter |
| 🔄 Reset to real price | Snap back to the real price instantly |
| ↩ Ease back | Return to the real price gradually |
| Trend speed | % change per minute (0.1 – 30%) |
| Extra noise | Additional volatility while controlling |
| Instant pump / dump ±1…10% | Jump the price immediately |
| Wick ⬆/⬇ | Spike the price and revert after ~0.7s |
| Hunt liq. / Hit SL / Hit TP | Drive the price to the open position's level |
| Funding rate | Set the rate, or settle funding immediately |
| Freeze price | Stop the price |

## Structure

```
src/engine/exchange.js   # price feed + simulation, matching, margin, liquidation, funding, alerts
src/components/          # Header, Chart, OrderBook, OrderForm, PriceControl, BottomTabs, Stats, Toasts
```
