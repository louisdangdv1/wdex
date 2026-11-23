import { useEffect, useState } from 'react';
import { ex, MARKETS, FEE_TAKER, FEE_MAKER, MMR, upnl } from '../engine/exchange';
import { fmt, cls } from '../utils';

const TYPES = [
  ['market', 'Market'],
  ['limit', 'Limit'],
  ['stop', 'Stop Market'],
];

export default function OrderForm({ sym, picked }) {
  const [type, setType] = useState('market');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('usdt'); // enter size in USDT or in coin
  const [price, setPrice] = useState('');
  const [stop, setStop] = useState('');
  const [lev, setLev] = useState(20);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [useTpSl, setUseTpSl] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');

  const m = ex.mk[sym];
  const cfg = MARKETS[sym];
  const pos = ex.acc.positions[sym];

  useEffect(() => {
    setPrice(String(ex.mk[sym].price));
    setStop('');
    setTp('');
    setSl('');
  }, [sym]);

  useEffect(() => {
    if (picked) {
      setType('limit');
      setPrice(String(picked.price));
    }
  }, [picked]);

  const px = type === 'limit' ? parseFloat(price) || m.price : type === 'stop' ? parseFloat(stop) || m.price : m.price;
  const raw = parseFloat(size) || 0;
  const sz = unit === 'usdt' ? raw : raw * px; // convert to USDT
  const feeRate = type === 'limit' ? FEE_MAKER : FEE_TAKER;
  const margin = reduceOnly ? 0 : sz / lev;
  const qty = sz / px;
  const fee = sz * feeRate;
  const maxSize = (ex.acc.balance * lev) / (1 + lev * FEE_TAKER);
  const liqLong = (px * (1 - 1 / lev)) / (1 - MMR);
  const liqShort = (px * (1 + 1 / lev)) / (1 + MMR);

  const setPct = (p) => {
    const usdt = Math.floor(((maxSize * p) / 100) * 100) / 100;
    setSize(unit === 'usdt' ? String(usdt) : String((usdt / px).toFixed(cfg.qdp + 2)));
  };

  // quick TP/SL by % ROE
  const quick = (roe) => {
    const move = roe / 100 / lev;
    setUseTpSl(true);
    setTp((px * (1 + move)).toFixed(cfg.dp));
    setSl((px * (1 - move)).toFixed(cfg.dp));
  };

  const submit = (side) => {
    let tpv = useTpSl && tp ? parseFloat(tp) : null;
    let slv = useTpSl && sl ? parseFloat(sl) : null;
    // quick TP/SL is computed for Long; swap TP and SL when shorting
    if (side === 'short' && tpv != null && slv != null && tpv > px && slv < px) [tpv, slv] = [slv, tpv];
    const ok = ex.placeOrder({
      sym, side, type, size: sz, lev, reduceOnly,
      price: parseFloat(price), stop: parseFloat(stop), tp: tpv, sl: slv,
    });
    if (ok) setSize('');
  };

  return (
    <section className="panel order-form">
      <div className="margin-mode">
        <span className="chip demo-chip">DEMO</span>
        <span className="chip">Isolated</span>
        <span className="chip">{lev}x</span>
        <span className="chip muted">One-way</span>
      </div>

      <div className="tabs small">
        {TYPES.map(([k, label]) => (
          <button
            key={k}
            className={type === k ? 'active' : ''}
            onClick={() => {
              setType(k);
              if (k === 'limit') setPrice(String(m.price));
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="avail">
        Available: <b>{fmt(ex.acc.balance)}</b> demo USDT
      </div>

      {type === 'limit' && (
        <label className="field">
          <span>Price</span>
          <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
          <em>USDT</em>
        </label>
      )}
      {type === 'stop' && (
        <label className="field">
          <span>Trigger price</span>
          <input type="number" step="any" value={stop} placeholder={String(m.price)} onChange={(e) => setStop(e.target.value)} />
          <em>USDT</em>
        </label>
      )}

      <label className="field">
        <span>Size</span>
        <input type="number" step="any" placeholder="0" value={size} onChange={(e) => setSize(e.target.value)} />
        <button className="unit-btn" onClick={() => { setUnit(unit === 'usdt' ? 'coin' : 'usdt'); setSize(''); }} title="Switch unit">
          {unit === 'usdt' ? 'USDT' : cfg.base} ⇄
        </button>
      </label>

      <div className="pct">
        {[10, 25, 50, 75, 100].map((p) => (
          <button key={p} onClick={() => setPct(p)}>{p}%</button>
        ))}
      </div>

      <div className="lev">
        <div className="lev-row">
          <span>Leverage</span>
          <b>{lev}x</b>
        </div>
        <input type="range" min="1" max="125" value={lev} onChange={(e) => setLev(+e.target.value)} />
        <div className="lev-quick">
          {[1, 5, 10, 20, 50, 100, 125].map((l) => (
            <button key={l} className={l === lev ? 'active' : ''} onClick={() => setLev(l)}>{l}x</button>
          ))}
        </div>
      </div>

      <div className="checks">
        <label className="check">
          <input type="checkbox" checked={useTpSl} disabled={reduceOnly} onChange={(e) => setUseTpSl(e.target.checked)} /> TP / SL
        </label>
        <label className="check" title="Only reduce an existing position, never open a new one">
          <input type="checkbox" checked={reduceOnly} onChange={(e) => { setReduceOnly(e.target.checked); if (e.target.checked) setUseTpSl(false); }} /> Reduce-only
        </label>
      </div>
      {useTpSl && !reduceOnly && (
        <div className="col">
          <div className="quick-row">
            <span className="muted">Quick (ROE):</span>
            {[25, 50, 100].map((r) => (
              <button key={r} onClick={() => quick(r)}>±{r}%</button>
            ))}
          </div>
          <label className="field">
            <span>Take profit</span>
            <input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="TP price" />
            <em>USDT</em>
          </label>
          <label className="field">
            <span>Stop loss</span>
            <input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="SL price" />
            <em>USDT</em>
          </label>
        </div>
      )}

      <div className="summary">
        <div><span>Order value</span><b>{fmt(sz)} USDT</b></div>
        <div><span>Margin</span><b>{fmt(margin)} USDT</b></div>
        <div><span>Quantity</span><b>{fmt(qty, cfg.qdp || 0)} {cfg.base}</b></div>
        <div><span>Fee ({(feeRate * 100).toFixed(2)}%)</span><b>{fmt(fee, 4)} USDT</b></div>
      </div>

      <div className="ls-btns">
        <button className="btn long" onClick={() => submit('long')}>Buy / Long <small>(demo)</small></button>
        <button className="btn short" onClick={() => submit('short')}>Sell / Short <small>(demo)</small></button>
      </div>

      {!reduceOnly && (
        <div className="summary">
          <div><span>Long liq. price ≈</span><b className="down">{fmt(liqLong, cfg.dp)}</b></div>
          <div><span>Short liq. price ≈</span><b className="down">{fmt(liqShort, cfg.dp)}</b></div>
        </div>
      )}

      {pos && (
        <div className="pos-mini">
          <div>
            Current position: <span className={`tag ${pos.side}`}>{pos.side === 'long' ? 'Long' : 'Short'}</span>{' '}
            {fmt(pos.qty, cfg.qdp)} {cfg.base}
          </div>
          <div className={cls(upnl(pos, m.price))}>
            PnL: {fmt(upnl(pos, m.price))} USDT ({((upnl(pos, m.price) / pos.margin) * 100).toFixed(2)}%)
          </div>
        </div>
      )}
    </section>
  );
}
