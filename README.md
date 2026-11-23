# 🐸 WPEPE – The Wise Frog’s Swamp

**🌐 Live: [https://wdex-841.netlify.app](https://wdex-841.netlify.app)**

WPEPE is a meme-powered practice swamp for crypto futures. Once upon a time, a frog named Wally leaped
onto a 125x long and landed face-first in the mud. He vowed no tadpole would ever get rekt without
practice again, and built the **Swamp Exchange**: real market prices, fake flies (demo USDT), zero rekt.

> ⚠️ Educational meme project. All balances are demo funds. **$WPEPE is a concept: no token has been issued,
> there is no contract address and nothing is for sale.** Never send money to anyone claiming otherwise.
> The WPEPE frog is an original character.

---

## 🗺 Pages

| Page | What's there |
|---|---|
| **FrogOS** `/` | Meme landing styled as a retro desktop: draggable windows, desktop icons, dock, live clock, frog assistant, sticky note, fireflies. Below: the 6-chapter comic lore, why-join stickers, tokenomics donut (concept), roadmap, how-to-join steps, **Meme Maker 3000** (PNG download), **Ribbit-o-meter** clicker with ranks, FAQ, community. Type `ribbit` anywhere for frog rain 🐸 |
| **Airdrop** `/airdrop` | Allowlist: connect MetaMask, sign a free message (no gas), quests, live points / tier / estimated $WPEPE, referral link + share, daily Lily Wheel spin, live joins, referral leaderboard, countdown and community goal |
| **Litepaper** `/whitepaper` | 10-section litepaper with sticky table of contents, embedded tokenomics and roadmap, print / save as PDF |
| **Home** `/app` | Hero, live ticker, Hot / Top gainers / Top volume, market pulse (global market cap, BTC dominance, Fear & Greed), latest news, coin ↔ USDT/VND converter, announcements, academy preview |
| **Markets** `/markets` | All pairs with 24h sparklines, sorting, favourites ⭐, gainers/losers, 30-day Fear & Greed history |
| **Trade** `/trade/BTCUSDT` | The DEMO futures exchange (chart, order book, order form, positions). Prices always follow the live market |
| **News** `/news` | Crypto headlines from CoinDesk, Cointelegraph, Decrypt, CryptoSlate and Bitcoin Magazine. Today / This week / All, daily digest, weekly stats, topic and source filters, search, auto-refresh every 5 min |
| **Academy** `/learn` | Original guides: perpetuals, leverage, liquidation, funding, order types, TP/SL, candlesticks, indicators, risk management, news |

### Wallet & airdrop

- Wallet connection uses EIP-6963 (MetaMask preferred, works with other injected wallets) and `window.ethereum` as fallback; on mobile it offers a MetaMask app deep link.
- Registrations go to the `airdrop` Netlify Function, which verifies the wallet signature (viem) and stores data in Netlify Blobs.
- Campaign settings (end date, goal, points, quests, tiers, wheel prizes, social links) live in `src/airdrop/config.js`.
- Export all registrations as CSV: set the `AIRDROP_ADMIN_KEY` environment variable on Netlify, redeploy, then open
  `/.netlify/functions/airdrop?export=csv&key=YOUR_KEY`.

News is collected by a Netlify Function (`netlify/functions/news.mjs`) because RSS feeds can't be read
directly from the browser. In development, Vite serves the same function locally.

## ✨ Features

### Market data
- 11 USDT pairs with **real-time prices**: BTC, ETH, SOL, BNB, DOGE, XRP, ADA, AVAX, LINK, LTC, TRX
- Real candle history (≈33h of 1m candles, last ~16 min of 1s candles) from public Binance market data
- Automatic fallback to a simulated feed when the connection drops, with auto-reconnect

### Chart (TradingView-style)
- Timeframes: 1s, 5s, 15s, 1m, 5m, 15m, 30m, 1h, 2h, 4h
- Chart types: Candles, Hollow candles, Heikin Ashi, Bars, Line, Area, Baseline
- **Indicators** menu
  - Overlays: Volume, MA (7/25/99), EMA (12/26), Bollinger Bands, VWAP, Parabolic SAR, SuperTrend
  - Oscillators in their own resizable panes: RSI, MACD, Stochastic, ATR
- OHLC legend with change %, volume, indicator values and a candle-close countdown (follows the crosshair)
- **Drawing tools**: horizontal line, trend line, Fibonacci retracement, undo, clear (saved per symbol)
- Log scale, magnet crosshair, reset view, screenshot (PNG), fullscreen (Esc to exit)
- Your buys / sells (B / S) and liquidations marked on the candles
- Entry, liquidation, TP/SL, open orders and price alerts drawn on the chart
- Chart clock is synced to the exchange so candles never go out of order

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
        ├── BottomTabs.jsx       # Positions, orders, history, alerts
        ├── Stats.jsx            # Statistics + equity curve
        └── Toasts.jsx           # Notifications
```

## 📄 License

MIT. Use it freely for learning and demos.
