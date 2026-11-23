import { useState } from 'react';
import { ex, MARKETS } from '../engine/exchange';
import { fmt, fmtTime } from '../utils';

const ROWS = 12;

export default function OrderBook({ sym, onPick }) {
  const [tab, setTab] = useState('ob');
  const m = ex.mk[sym];
  const cfg = MARKETS[sym];
  const asks = m.book.asks.slice(0, ROWS);
  const bids = m.book.bids.slice(0, ROWS);
  const max = Math.max(asks.at(-1)?.total || 1, bids.at(-1)?.total || 1);
  const qdp = Math.max(cfg.qdp, 1);

  const Row = ({ l, side }) => (
    <div className={`ob-row ${side}`} onClick={() => onPick(l.price)} title="Click to set limit price">
      <div className="bar" style={{ width: `${(l.total / max) * 100}%` }} />
      <span className={side === 'ask' ? 'down' : 'up'}>{fmt(l.price, cfg.dp)}</span>
      <span>{fmt(l.qty, qdp)}</span>
      <span>{fmt(l.total, qdp)}</span>
    </div>
  );

  return (
    <section className="panel book">
      <div className="tabs small">
        <button className={tab === 'ob' ? 'active' : ''} onClick={() => setTab('ob')}>Order Book</button>
        <button className={tab === 'tr' ? 'active' : ''} onClick={() => setTab('tr')}>Trades</button>
      </div>

      {tab === 'ob' ? (
        <div>
          <div className="ob-head">
            <span>Price (USDT)</span>
            <span>Size ({cfg.base})</span>
            <span>Total</span>
          </div>
          {[...asks].reverse().map((l) => <Row key={'a' + l.price} l={l} side="ask" />)}
          <div className={`ob-mid ${m.dir > 0 ? 'up' : 'down'}`}>
            {fmt(m.price, cfg.dp)} {m.dir > 0 ? '↑' : '↓'}
          </div>
          {bids.map((l) => <Row key={'b' + l.price} l={l} side="bid" />)}
        </div>
      ) : (
        <div className="trades">
          <div className="ob-head">
            <span>Price (USDT)</span>
            <span>Size ({cfg.base})</span>
            <span>Time</span>
          </div>
          {m.trades.map((t) => (
            <div key={t.id} className="ob-row">
              <span className={t.side === 'buy' ? 'up' : 'down'}>{fmt(t.price, cfg.dp)}</span>
              <span>{fmt(t.qty, qdp)}</span>
              <span>{fmtTime(t.time)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
