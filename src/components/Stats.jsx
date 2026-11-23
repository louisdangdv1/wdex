import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { ex, START_BALANCE } from '../engine/exchange';
import { fmt, cls } from '../utils';

const TZ = -new Date().getTimezoneOffset() * 60;

function computeStats() {
  const h = ex.acc.history;
  const closes = h.filter((x) => x.action === 'Close' || x.action === 'Liquidation');
  const wins = closes.filter((x) => x.pnl > 0);
  const losses = closes.filter((x) => x.pnl <= 0);
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const gross = sum(closes, (x) => x.pnl);
  const fees = sum(h, (x) => x.fee || 0);
  const funding = sum(h.filter((x) => x.action === 'Funding'), (x) => x.pnl);
  const grossWin = sum(wins, (x) => x.pnl);
  const grossLoss = -sum(losses, (x) => x.pnl);
  const bySym = {};
  for (const x of closes) bySym[x.sym] = (bySym[x.sym] || 0) + x.pnl;
  return {
    trades: closes.length,
    winRate: closes.length ? (wins.length / closes.length) * 100 : 0,
    gross,
    fees,
    funding,
    net: gross - fees + funding,
    best: closes.length ? Math.max(...closes.map((x) => x.pnl)) : 0,
    worst: closes.length ? Math.min(...closes.map((x) => x.pnl)) : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    pf: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    liqs: h.filter((x) => x.action === 'Liquidation').length,
    bySym: Object.entries(bySym).sort((a, b) => b[1] - a[1]),
  };
}

export default function Stats() {
  const s = computeStats();
  const { equity } = ex.equity();
  const ret = ((equity - START_BALANCE) / START_BALANCE) * 100;

  const cards = [
    ['Equity', `${fmt(equity)} USDT`, ''],
    ['Return on starting capital', `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`, cls(ret)],
    ['Net PnL (after fees + funding)', `${s.net >= 0 ? '+' : ''}${fmt(s.net)}`, cls(s.net)],
    ['Closed trades', s.trades, ''],
    ['Win rate', `${s.winRate.toFixed(1)}%`, s.winRate >= 50 ? 'up' : 'down'],
    ['Profit factor', s.pf === Infinity ? '∞' : s.pf.toFixed(2), s.pf >= 1 ? 'up' : 'down'],
    ['Avg win / Avg loss', `${fmt(s.avgWin)} / ${fmt(s.avgLoss)}`, ''],
    ['Best trade', `+${fmt(s.best)}`, 'up'],
    ['Worst trade', fmt(s.worst), 'down'],
    ['Total fees', fmt(s.fees), ''],
    ['Funding', `${s.funding >= 0 ? '+' : ''}${fmt(s.funding, 4)}`, cls(s.funding)],
    ['Liquidations', s.liqs, s.liqs ? 'down' : ''],
  ];

  return (
    <div className="stats">
      <div className="stat-cards">
        {cards.map(([l, v, c]) => (
          <div key={l} className="stat-card">
            <label>{l}</label>
            <b className={c}>{v}</b>
          </div>
        ))}
      </div>
      <div className="stats-bottom">
        <div className="equity-box">
          <div className="muted">Equity curve (updated every 10 seconds)</div>
          <EquityChart />
        </div>
        <div className="bysym">
          <div className="muted">PnL by symbol</div>
          {s.bySym.length === 0 && <div className="muted empty">No data yet</div>}
          {s.bySym.map(([sym, v]) => (
            <div key={sym} className="bysym-row">
              <span>{sym}</span>
              <b className={cls(v)}>{v >= 0 ? '+' : ''}{fmt(v)}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EquityChart() {
  const el = useRef(null);
  useEffect(() => {
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { color: '#141821' }, textColor: '#8a93a6', fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: '#1c2230' } },
      rightPriceScale: { borderColor: '#242b3a' },
      timeScale: { borderColor: '#242b3a', timeVisible: true },
    });
    const area = chart.addAreaSeries({
      lineColor: '#7c5cff', topColor: 'rgba(124,92,255,.35)', bottomColor: 'rgba(124,92,255,0)', lineWidth: 2,
    });
    area.createPriceLine({ price: START_BALANCE, color: '#8a93a6', lineStyle: 2, lineWidth: 1, title: 'Start' });
    let n = -1;
    const sync = () => {
      const h = ex.acc.equityHist;
      if (h.length === n) return;
      n = h.length;
      area.setData(h.map((p) => ({ time: p.t + TZ, value: p.v })));
    };
    sync();
    chart.timeScale().fitContent();
    const unsub = ex.subscribe(sync);
    return () => {
      unsub();
      chart.remove();
    };
  }, []);
  return <div className="equity-chart" ref={el} />;
}
