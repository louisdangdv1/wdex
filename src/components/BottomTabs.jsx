import { useState } from 'react';
import { ex, MARKETS, liqPrice, upnl } from '../engine/exchange';
import { fmt, fmtDateTime, cls } from '../utils';
import Stats from './Stats';

export default function BottomTabs({ sym, setSym }) {
  const [tab, setTab] = useState('pos');
  const positions = Object.values(ex.acc.positions);
  const orders = ex.acc.orders;

  const T = ({ k, children }) => (
    <button className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{children}</button>
  );

  return (
    <section className="panel bottom">
      <div className="tabs">
        <T k="pos">Positions ({positions.length})</T>
        <T k="ord">Open Orders ({orders.length})</T>
        <T k="his">History</T>
        <T k="alert">Alerts ({ex.alerts.length})</T>
        <T k="stats">Statistics</T>
        <div className="spacer" />
        {tab === 'pos' && positions.length > 0 && (
          <button className="mini danger" onClick={() => ex.closeAll()}>Close all</button>
        )}
        {tab === 'ord' && orders.length > 0 && (
          <button className="mini danger" onClick={() => ex.cancelAllOrders()}>Cancel all</button>
        )}
        <button className="link-btn" onClick={() => confirm('Reset the demo account to 10,000 USDT?') && ex.resetAccount()}>
          Reset account
        </button>
      </div>
      <div className="table-wrap">
        {tab === 'pos' && <Positions positions={positions} setSym={setSym} />}
        {tab === 'ord' && <Orders orders={orders} />}
        {tab === 'his' && <History />}
        {tab === 'alert' && <Alerts sym={sym} />}
        {tab === 'stats' && <Stats />}
      </div>
    </section>
  );
}

function Empty({ cols, text }) {
  return (
    <tr>
      <td colSpan={cols} className="empty">{text}</td>
    </tr>
  );
}

function Positions({ positions, setSym }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Symbol</th><th>Size</th><th>Entry</th><th>Mark</th><th>Liq. price</th>
          <th>Margin</th><th>PnL (ROE%)</th><th>TP / SL</th><th></th>
        </tr>
      </thead>
      <tbody>
        {positions.length === 0 && <Empty cols={9} text="No open positions" />}
        {positions.map((p) => {
          const cfg = MARKETS[p.sym];
          const price = ex.mk[p.sym].price;
          const pnl = upnl(p, price);
          const roe = (pnl / p.margin) * 100;
          const liq = liqPrice(p);
          const risk = Math.abs(price - liq) / price < 0.01; // within 1% of liquidation
          return (
            <tr key={p.sym}>
              <td>
                <span className={`tag ${p.side}`}>{p.side === 'long' ? 'Long' : 'Short'}</span>{' '}
                <a onClick={() => setSym(p.sym)}>{p.sym}</a> <span className="muted">{p.leverage.toFixed(1)}x</span>
              </td>
              <td>{fmt(p.qty, cfg.qdp)} {cfg.base}<div className="muted">{fmt(p.qty * price)} USDT</div></td>
              <td>{fmt(p.entry, cfg.dp)}</td>
              <td>{fmt(price, cfg.dp)}</td>
              <td className={risk ? 'down blink' : 'warn'}>{fmt(liq, cfg.dp)}{risk && ' ⚠'}</td>
              <td><MarginEditor pos={p} /></td>
              <td className={cls(pnl)}>
                {pnl >= 0 ? '+' : ''}{fmt(pnl)} USDT
                <div>({roe >= 0 ? '+' : ''}{roe.toFixed(2)}%)</div>
              </td>
              <td><TpSlEditor pos={p} /></td>
              <td>
                <button className="mini" onClick={() => ex.closePosition(p.sym, 0.5)}>50%</button>
                <button className="mini" onClick={() => ex.reversePosition(p.sym)} title="Flip position">Flip</button>
                <button className="mini danger" onClick={() => ex.closePosition(p.sym, 1)}>Close</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MarginEditor({ pos }) {
  const [edit, setEdit] = useState(false);
  const [amt, setAmt] = useState('');
  if (!edit) {
    return (
      <span className="tpsl" onClick={() => setEdit(true)} title="Add / remove margin">
        {fmt(pos.margin)} ✎
      </span>
    );
  }
  const go = (sign) => {
    const v = parseFloat(amt);
    if (v > 0) ex.adjustMargin(pos.sym, sign * v);
    setAmt('');
    setEdit(false);
  };
  return (
    <span className="tpsl-edit">
      <input placeholder="USDT" value={amt} onChange={(e) => setAmt(e.target.value)} autoFocus />
      <button className="mini" onClick={() => go(1)}>+ Add</button>
      <button className="mini" onClick={() => go(-1)}>− Remove</button>
      <button className="mini" onClick={() => setEdit(false)}>✕</button>
    </span>
  );
}

function TpSlEditor({ pos }) {
  const [edit, setEdit] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const cfg = MARKETS[pos.sym];

  if (!edit) {
    return (
      <span className="tpsl" onClick={() => { setTp(pos.tp ?? ''); setSl(pos.sl ?? ''); setEdit(true); }}>
        <span className="up">{pos.tp != null ? fmt(pos.tp, cfg.dp) : '--'}</span> /{' '}
        <span className="down">{pos.sl != null ? fmt(pos.sl, cfg.dp) : '--'}</span> ✎
      </span>
    );
  }
  const save = () => {
    ex.setTpSl(pos.sym, tp === '' ? null : parseFloat(tp), sl === '' ? null : parseFloat(sl));
    setEdit(false);
  };
  return (
    <span className="tpsl-edit">
      <input placeholder="TP" value={tp} onChange={(e) => setTp(e.target.value)} />
      <input placeholder="SL" value={sl} onChange={(e) => setSl(e.target.value)} />
      <button className="mini" onClick={save}>Save</button>
      <button className="mini" onClick={() => setEdit(false)}>✕</button>
    </span>
  );
}

function Orders({ orders }) {
  return (
    <table>
      <thead>
        <tr><th>Time</th><th>Symbol</th><th>Type</th><th>Side</th><th>Price / Trigger</th><th>Quantity</th><th>Locked margin</th><th>TP / SL</th><th></th></tr>
      </thead>
      <tbody>
        {orders.length === 0 && <Empty cols={9} text="No open orders" />}
        {orders.map((o) => {
          const cfg = MARKETS[o.sym];
          const stop = o.type === 'stop';
          return (
            <tr key={o.id}>
              <td>{fmtDateTime(o.time)}</td>
              <td>{o.sym} <span className="muted">{o.lev}x</span></td>
              <td>{stop ? 'Stop Market' : 'Limit'}{o.reduceOnly && <span className="chip-mini">Reduce</span>}</td>
              <td><span className={`tag ${o.side}`}>{o.side === 'long' ? 'Long' : 'Short'}</span></td>
              <td>{stop ? (o.trigger === 'up' ? '≥ ' : '≤ ') : ''}{fmt(o.price, cfg.dp)}</td>
              <td>{fmt(o.qty, cfg.qdp)} {cfg.base}</td>
              <td>{fmt(o.locked)}</td>
              <td>{o.tp ?? '--'} / {o.sl ?? '--'}</td>
              <td><button className="mini danger" onClick={() => ex.cancelOrder(o.id)}>Cancel</button></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function History() {
  const [filter, setFilter] = useState('all');
  const all = ex.acc.history;
  const h = filter === 'all' ? all : all.filter((x) => x.action === filter);
  return (
    <>
      <div className="filter-row">
        {['all', 'Open', 'Close', 'Liquidation', 'Funding'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <button className="mini" onClick={() => exportCsv(all)}>⬇ Export CSV</button>
      </div>
      <table>
        <thead>
          <tr><th>Time</th><th>Symbol</th><th>Action</th><th>Position side</th><th>Price</th><th>Quantity</th><th>Fee</th><th>PnL</th></tr>
        </thead>
        <tbody>
          {h.length === 0 && <Empty cols={8} text="No trades yet" />}
          {h.map((x) => {
            const cfg = MARKETS[x.sym] || { dp: 2, qdp: 2, base: '' };
            return (
              <tr key={x.id}>
                <td>{fmtDateTime(x.time)}</td>
                <td>{x.sym}</td>
                <td className={x.action === 'Liquidation' ? 'down' : ''}>{x.action} <span className="muted">· {x.reason}</span></td>
                <td><span className={`tag ${x.side}`}>{x.side === 'long' ? 'Long' : 'Short'}</span></td>
                <td>{fmt(x.price, cfg.dp)}</td>
                <td>{fmt(x.qty, cfg.qdp)} {cfg.base}</td>
                <td>{fmt(x.fee, 4)}</td>
                <td className={x.pnl == null ? '' : cls(x.pnl)}>{x.pnl == null ? '--' : `${x.pnl >= 0 ? '+' : ''}${fmt(x.pnl, 4)}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

function exportCsv(rows) {
  const head = 'time,symbol,action,reason,side,price,qty,fee,pnl';
  const lines = rows.map((x) =>
    [new Date(x.time).toISOString(), x.sym, x.action, x.reason, x.side, x.price, x.qty, x.fee, x.pnl ?? ''].join(','),
  );
  const blob = new Blob(['﻿' + [head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wdex-history-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Alerts({ sym }) {
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const cfg = MARKETS[sym];
  const add = () => {
    ex.addAlert(sym, parseFloat(price), note);
    setPrice('');
    setNote('');
  };
  return (
    <>
      <div className="filter-row">
        <span className="muted">Create alert for <b>{sym}</b> (current price {fmt(ex.mk[sym].price, cfg.dp)}):</span>
        <input className="inline-input" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className="inline-input wide" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="mini" onClick={add}>🔔 Create</button>
      </div>
      <table>
        <thead>
          <tr><th>Created</th><th>Symbol</th><th>Condition</th><th>Current price</th><th>Note</th><th></th></tr>
        </thead>
        <tbody>
          {ex.alerts.length === 0 && <Empty cols={6} text="No price alerts" />}
          {ex.alerts.map((a) => {
            const c = MARKETS[a.sym];
            return (
              <tr key={a.id}>
                <td>{fmtDateTime(a.time)}</td>
                <td>{a.sym}</td>
                <td>{a.dir === 'up' ? 'Price ≥ ' : 'Price ≤ '}{fmt(a.price, c.dp)}</td>
                <td>{fmt(ex.mk[a.sym].price, c.dp)}</td>
                <td>{a.note || '--'}</td>
                <td><button className="mini danger" onClick={() => ex.removeAlert(a.id)}>Delete</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
