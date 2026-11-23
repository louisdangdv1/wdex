import { useState } from 'react';
import { ex, MARKETS } from './engine/exchange';
import { useTick, fmt, fmtPct, fmtCompact, cls } from './utils';
import Header from './components/Header';
import Chart from './components/Chart';
import OrderBook from './components/OrderBook';
import OrderForm from './components/OrderForm';
import PriceControl from './components/PriceControl';
import BottomTabs from './components/BottomTabs';
import Toasts from './components/Toasts';

const pad = (n) => String(n).padStart(2, '0');
const countdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export default function App() {
  useTick();
  const [sym, setSym] = useState('BTCUSDT');
  const [iv, setIv] = useState('1m');
  const [picked, setPicked] = useState(null); // price clicked in the order book

  const m = ex.mk[sym];
  const cfg = MARKETS[sym];
  const st = ex.stats24(sym);
  const c = ex.ctrl[sym];

  const modeLabel = c.paused
    ? '⏸ Frozen'
    : c.mode === 'live' && Math.abs(c.k - 1) > 1e-6
      ? `🌐 Real price (offset ${((c.k - 1) * 100).toFixed(2)}%)`
      : { live: '🌐 Real price', up: '📈 Uptrend', down: '📉 Downtrend', target: '🎯 Target', revert: '↩ Returning to real' }[c.mode];

  return (
    <>
      <Header sym={sym} setSym={setSym} />
      <main className="layout">
        <section className="panel chart-panel">
          <div className="sym-bar">
            <div className="sym-name">
              {sym} <small>Perpetual</small>
            </div>
            <div className={`sym-price ${m.dir > 0 ? 'up' : 'down'}`}>{fmt(m.price, cfg.dp)}</div>
            <Stat label="24h Change" value={fmtPct(st.change)} className={cls(st.change)} />
            <Stat label="24h High" value={fmt(st.high, cfg.dp)} />
            <Stat label="24h Low" value={fmt(st.low, cfg.dp)} />
            <Stat label="24h Vol (USDT)" value={fmtCompact(st.volume)} />
            <Stat
              label="Funding / Countdown"
              value={`${c.funding.toFixed(4)}% / ${countdown(ex.nextFunding - Date.now())}`}
              className={c.funding >= 0 ? 'warn' : 'up'}
            />
            <Stat label="Price mode" value={modeLabel} />
          </div>
          <Chart sym={sym} iv={iv} setIv={setIv} />
        </section>

        <OrderBook sym={sym} onPick={(price) => setPicked({ price, n: Date.now() })} />

        <div className="side-col">
          <OrderForm sym={sym} picked={picked} />
          <PriceControl sym={sym} />
        </div>

        <BottomTabs sym={sym} setSym={setSym} />
      </main>
      <Toasts />
    </>
  );
}

function Stat({ label, value, className = '' }) {
  return (
    <div className="stat">
      <label>{label}</label>
      <span className={className}>{value}</span>
    </div>
  );
}
