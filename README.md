# ⚡ WDex – Perpetual Futures Trading

**🌐 Live demo: [https://wdex-841.netlify.app](https://wdex-841.netlify.app)**

WDex is a perpetual-futures trading web app that runs on **demo funds**. Prices stream from the real
market in real time, and a built-in **Price Control** panel lets you push the price up or down, set a
target, pump/dump instantly, and snap back to the real price whenever you want.

> ⚠️ Demo / educational project only. No real money, no wallet, no blockchain transactions.
> Every visitor gets their own demo account stored in their browser.

---

## ✨ Features

### Market data
- 11 USDT pairs with **real-time prices**: BTC, ETH, SOL, BNB, DOGE, XRP, ADA, AVAX, LINK, LTC, TRX
- Real candle history (≈33h of 1m candles, last ~16 min of 1s candles) from public Binance market data
- Automatic fallback to a simulated feed when the connection drops, with auto-reconnect

### Chart
- Timeframes: 1s, 5s, 15s, 1m, 5m, 15m, 1h, 4h
- Indicators: **MA** (7/25/99), **EMA** (12/26), **BOLL** (20, 2), volume toggle
- Entry, liquidation, TP/SL, open orders and price alerts drawn on the chart

### Trading
- **Market / Limit / Stop Market** orders, **Long / Short**, leverage **1–125x**
- Isolated margin, one-way mode, **reduce-only**
- TP/SL when opening (plus quick TP/SL by ±25/50/100% ROE) or edit later
- Size in USDT or in coin, 10–100% quick size buttons
- Fees: taker 0.05%, maker 0.02%
- Liquidation engine (maintenance margin 0.5%)
- **Funding** every 8h (00:00 / 08:00 / 16:00 UTC) with countdown

### Positions & account
- Add / remove margin, **flip** position, close 50% / 100%, close all
- ⚠ Warning when price is within 1% of liquidation
- Order book (click a price to fill a Limit order) and recent trades
- **Price alerts** 🔔 with sound, sound on/off toggle 🔊
- History with filters (Open / Close / Liquidation / Funding) and **CSV export**
- **Statistics**: win rate, profit factor, avg win/loss, best/worst trade, fees, PnL by symbol, **equity curve**
- 10,000 USDT starting balance, "+ Deposit" for more, everything saved in `localStorage`

---

## 🎛 Price Control

The exchange price is `real price × offset factor`. Changing the trend only changes the offset, so the
price still moves with the real market, just shifted up or down.

| Control | What it does |
|---|---|
| 🌐 Real price | Follow the real market (offset is kept if one was applied) |
| 📈 Up / 📉 Down | Trend the price up or down at the chosen speed |
| 🎯 Target + **Go** | Move the price gradually to a level you enter (shows ETA) |
| 🔄 **Reset to real price** | Snap back to the real price instantly |
| ↩ **Ease back** | Return to the real price gradually |
| Trend speed | 0.1 – 30% per minute |
| Extra noise | Additional volatility while the price is controlled |
| Instant pump / dump | ±1, 2, 5, 10% jump |
| Wick ⬆ / ⬇ | Spike the price 2% or 5% and revert after ~0.7s |
| 💥 Hunt liq. / 🛑 Hit SL / 💰 Hit TP | Drive the price to the open position's level |
| Funding rate | Set -0.5% … 0.5%, or settle funding now |
| ⏸ Freeze price | Stop the price completely |
| 🔄 Reset all pairs | Return every pair to its real price |

---

## 🛠 Tech stack

- [React 18](https://react.dev) + [Vite 5](https://vitejs.dev)
- [lightweight-charts 4](https://github.com/tradingview/lightweight-charts) for candles and the equity curve
- Public Binance market data (REST + WebSocket, no API key)
- Hosted on [Netlify](https://www.netlify.com)

## 🚀 Getting started

Requirements: **Node.js 18+**

```bash
git clone https://github.com/louisdangdv1/wdex.git
cd wdex
npm install
npm run dev        # http://localhost:5173
```

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run deploy` | Build and deploy to Netlify (needs `npx netlify-cli login` once) |

## 📁 Project structure

```
wdex/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                 # React entry
    ├── App.jsx                  # Layout, symbol bar, chart toolbar
    ├── utils.js                 # useTick hook + number/date formatters
    ├── index.css                # Dark theme styles
    ├── engine/
    │   └── exchange.js          # Price feed & simulation, matching, margin,
    │                            # liquidation, funding, alerts, persistence
    └── components/
        ├── Header.jsx           # Logo, symbol tabs, account summary
        ├── Chart.jsx            # Candles, volume, indicators, price lines
        ├── OrderBook.jsx        # Order book + recent trades
        ├── OrderForm.jsx        # Order entry
        ├── PriceControl.jsx     # 🎛 Price Control panel
        ├── BottomTabs.jsx       # Positions, orders, history, alerts
        ├── Stats.jsx            # Statistics + equity curve
        └── Toasts.jsx           # Notifications
```

## 📄 License

MIT. Use it freely for learning and demos.
