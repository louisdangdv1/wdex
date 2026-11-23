import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ex, MARKETS, SYMBOLS } from '../engine/exchange';
import { fmt, fmtPct, fmtCompact, cls } from '../utils';
import Chart from '../components/Chart';
import OrderBook from '../components/OrderBook';
import OrderForm from '../components/OrderForm';
import BottomTabs from '../components/BottomTabs';
import { CoinIcon } from '../components/common';

const pad = (n) => String(n).padStart(2, '0');
const countdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export default function Trade() {
  const { sym: param } = useParams();
  const navigate = useNavigate();
  const [iv, setIv] = useState('1m');
  const [picked, setPicked] = useState(null); // price clicked in the order book

  const sym = (param || '').toUpperCase();
  if (!MARKETS[sym]) return <Navigate to="/trade/BTCUSDT" replace />;
  const setSym = (s) => navigate(`/trade/${s}`);

  const m = ex.mk[sym];
  const cfg = MARKETS[sym];
  const st = ex.stats24(sym);
  const c = ex.ctrl[sym];

  return (
    <>
      <div className="demo-strip">
        <span className="demo-tag">DEMO</span>
        <span>Demo trading with virtual USDT · prices follow the real market · no real money is used</span>
      </div>
      <nav className="sym-tabs pair-bar">
        {SYMBOLS.map((s) => {
          const ch = ex.stats24(s).change;
          return (
            <button key={s} className={s === sym ? 'active' : ''} onClick={() => setSym(s)}>
              <span className="pair-top">
                <CoinIcon base={MARKETS[s].base} size={14} /> <b>{MARKETS[s].base}</b>
              </span>
              <span>{fmt(ex.mk[s].price, MARKETS[s].dp)}</span>
              <span className={cls(ch)}>{fmtPct(ch)}</span>
            </button>
          );
        })}
      </nav>

      <main className="layout">
        <section className="panel chart-panel">
          <div className="sym-bar">
            <div className="sym-name">
              <CoinIcon base={cfg.base} size={22} /> {sym} <small>Perpetual</small> <span className="demo-tag">DEMO</span>
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
            <Stat label="Source" value="🌐 Live" />
          </div>
          <Chart sym={sym} iv={iv} setIv={setIv} />
        </section>

        <OrderBook sym={sym} onPick={(price) => setPicked({ price, n: Date.now() })} />

        <div className="side-col">
          <OrderForm sym={sym} picked={picked} />
        </div>

        <BottomTabs sym={sym} setSym={setSym} />
      </main>
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
