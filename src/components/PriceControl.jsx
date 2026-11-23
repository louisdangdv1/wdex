import { useEffect, useState } from 'react';
import { ex, MARKETS } from '../engine/exchange';
import { fmt, cls } from '../utils';

const MODES = [
  ['live', '🌐 Real price'],
  ['up', '📈 Up'],
  ['down', '📉 Down'],
  ['target', '🎯 Target'],
];
const SHOCKS = [-10, -5, -2, -1, 1, 2, 5, 10];

export default function PriceControl({ sym }) {
  const c = ex.ctrl[sym];
  const m = ex.mk[sym];
  const cfg = MARKETS[sym];
  const real = ex.real[sym];
  const dev = (m.price / real - 1) * 100;
  const isLive = ex.feed === 'live';
  const pos = ex.acc.positions[sym];
  const [target, setTarget] = useState('');

  useEffect(() => setTarget(String(ex.mk[sym].price)), [sym]);

  const set = (patch) => ex.setCtrl(sym, patch);
  const goTarget = () => {
    const t = parseFloat(target);
    if (t > 0) set({ mode: 'target', target: t, paused: false });
  };

  let eta = null;
  if (c.mode === 'target' && !c.paused) {
    const dist = Math.abs(c.target - m.price);
    const perMin = (m.price * c.speed) / 100;
    eta = dist < 10 ** -cfg.dp * 5 ? 'reached' : `~${Math.ceil((dist / perMin) * 60)}s left`;
  }

  return (
    <section className="panel control">
      <div className="control-title">
        🎛 Price Control <span className="muted">{sym}</span>
      </div>

      <div className="price-compare">
        <div>
          <label>
            Real price <span className={isLive ? 'up' : 'warn'}>● {isLive ? 'Live' : 'Offline'}</span>
          </label>
          <b>{fmt(real, cfg.dp)}</b>
        </div>
        <div>
          <label>Exchange</label>
          <b>{fmt(m.price, cfg.dp)}</b>
        </div>
        <div>
          <label>Offset</label>
          <b className={Math.abs(dev) < 0.005 ? '' : cls(dev)}>
            {dev >= 0 ? '+' : ''}
            {dev.toFixed(2)}%
          </b>
        </div>
      </div>

      <div className="reset-row">
        <button className="btn primary" onClick={() => ex.resetToReal(sym)} title="Snap price back to the real price now">
          🔄 Reset to real price
        </button>
        <button
          className={`btn ghost ${c.mode === 'revert' ? 'active-ghost' : ''}`}
          onClick={() => ex.revertToReal(sym)}
          title="Gradually return to the real price at trend speed"
        >
          ↩ Ease back
        </button>
      </div>

      <div className="mode-grid">
        {MODES.map(([k, label]) => (
          <button
            key={k}
            className={c.mode === k && !c.paused ? `active ${k}` : ''}
            onClick={() => (k === 'target' ? goTarget() : set({ mode: k, paused: false }))}
          >
            {label}
          </button>
        ))}
      </div>
      {c.mode === 'revert' && <div className="muted small-text">Returning to real price…</div>}

      <div className="slider">
        <div className="lev-row">
          <span>Trend speed</span>
          <b>{c.speed}%/min</b>
        </div>
        <input type="range" min="0.1" max="30" step="0.1" value={c.speed} onChange={(e) => set({ speed: +e.target.value })} />
      </div>

      <div className="slider">
        <div className="lev-row">
          <span>Extra noise (when controlled)</span>
          <b>{c.vol}x</b>
        </div>
        <input type="range" min="0" max="5" step="0.1" value={c.vol} onChange={(e) => set({ vol: +e.target.value })} />
      </div>

      <div className="target-row">
        <label className="field">
          <span>Target price</span>
          <input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <button className="btn primary" onClick={goTarget}>Go</button>
      </div>
      {eta && (
        <div className="muted small-text">
          Moving to {fmt(c.target, cfg.dp)}, {eta}
        </div>
      )}

      <div className="lev-row"><span>Instant pump / dump</span></div>
      <div className="shock-grid">
        {SHOCKS.map((p) => (
          <button key={p} className={p > 0 ? 'up-btn' : 'down-btn'} onClick={() => ex.shock(sym, p)}>
            {p > 0 ? '+' : ''}
            {p}%
          </button>
        ))}
      </div>

      <div className="lev-row"><span>Wick (spike then revert)</span></div>
      <div className="shock-grid">
        {[-5, -2, 2, 5].map((p) => (
          <button key={p} className={p > 0 ? 'up-btn' : 'down-btn'} onClick={() => ex.wick(sym, p)}>
            {p > 0 ? '⬆ ' : '⬇ '}
            {Math.abs(p)}%
          </button>
        ))}
      </div>

      <div className="lev-row"><span>Move price to position {pos ? '' : '(no position)'}</span></div>
      <div className="hunt-grid">
        <button disabled={!pos} onClick={() => ex.hunt(sym, 'liq')}>💥 Hunt liq.</button>
        <button disabled={!pos || pos.sl == null} onClick={() => ex.hunt(sym, 'sl')}>🛑 Hit SL</button>
        <button disabled={!pos || pos.tp == null} onClick={() => ex.hunt(sym, 'tp')}>💰 Hit TP</button>
      </div>

      <div className="lev-row">
        <span>Funding rate (every 8h)</span>
        <b className={c.funding >= 0 ? 'warn' : 'up'}>{c.funding.toFixed(4)}%</b>
      </div>
      <input
        type="range" min="-0.5" max="0.5" step="0.005" value={c.funding}
        onChange={(e) => set({ funding: +e.target.value })}
      />
      <div className="reset-row">
        <button className="btn ghost" onClick={() => set({ funding: 0.01 })}>Default 0.01%</button>
        <button className="btn ghost" onClick={() => ex.applyFunding()}>💸 Settle funding now</button>
      </div>

      <div className="reset-row">
        <button className={`btn ${c.paused ? 'long' : 'ghost'}`} onClick={() => set({ paused: !c.paused })}>
          {c.paused ? '▶ Resume' : '⏸ Freeze price'}
        </button>
        <button className="btn ghost" onClick={() => ex.resetAllToReal()}>🔄 Reset all pairs</button>
      </div>
    </section>
  );
}
