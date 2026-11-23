import { memo, useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { ex, MARKETS, INTERVALS, aggregate, lastBar, liqPrice } from '../engine/exchange';

// chart uses UTC -> add offset to show local time
const TZ = -new Date().getTimezoneOffset() * 60;
const UP = '#16c784';
const DOWN = '#ea3943';

export const INDICATORS = {
  ma: { label: 'MA', lines: [['MA7', 7, '#f0b90b'], ['MA25', 25, '#e040fb'], ['MA99', 99, '#00d1ff']] },
  ema: { label: 'EMA', lines: [['EMA12', 12, '#ff9800'], ['EMA26', 26, '#4caf50']] },
  boll: { label: 'BOLL', lines: [['UP', 20, '#7c5cff'], ['MB', 20, '#8a93a6'], ['DN', 20, '#7c5cff']] },
};

const toCandle = (b) => ({ time: b.time + TZ, open: b.open, high: b.high, low: b.low, close: b.close });
const toVol = (b) => ({
  time: b.time + TZ,
  value: b.volume,
  color: b.close >= b.open ? 'rgba(22,199,132,.35)' : 'rgba(234,57,67,.35)',
});

// ---- indicator math ----
function sma(bars, n) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].close;
    if (i >= n) sum -= bars[i - n].close;
    if (i >= n - 1) out.push({ time: bars[i].time + TZ, value: sum / n });
  }
  return out;
}
function ema(bars, n) {
  const out = [];
  const k = 2 / (n + 1);
  let e = null;
  for (let i = 0; i < bars.length; i++) {
    e = e == null ? bars[i].close : bars[i].close * k + e * (1 - k);
    if (i >= n - 1) out.push({ time: bars[i].time + TZ, value: e });
  }
  return out;
}
function boll(bars, n = 20, mult = 2) {
  const up = [], mb = [], dn = [];
  for (let i = n - 1; i < bars.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += bars[j].close;
    const mean = s / n;
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (bars[j].close - mean) ** 2;
    const sd = Math.sqrt(v / n);
    const t = bars[i].time + TZ;
    up.push({ time: t, value: mean + mult * sd });
    mb.push({ time: t, value: mean });
    dn.push({ time: t, value: mean - mult * sd });
  }
  return [up, mb, dn];
}
function calc(key, bars) {
  if (key === 'ma') return INDICATORS.ma.lines.map(([, n]) => sma(bars, n));
  if (key === 'ema') return INDICATORS.ema.lines.map(([, n]) => ema(bars, n));
  return boll(bars);
}

function Chart({ sym, iv, inds, showVol }) {
  const el = useRef(null);
  const r = useRef({});

  useEffect(() => {
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { color: '#141821' }, textColor: '#8a93a6', fontSize: 11 },
      grid: { vertLines: { color: '#1c2230' }, horzLines: { color: '#1c2230' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#242b3a' },
      timeScale: { borderColor: '#242b3a', timeVisible: true, secondsVisible: true, rightOffset: 8 },
    });
    const candle = chart.addCandlestickSeries({
      upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false,
    });
    candle.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } });
    const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    r.current = { chart, candle, vol, lines: [], sig: '' };
    return () => chart.remove();
  }, []);

  useEffect(() => {
    r.current.vol.applyOptions({ visible: showVol });
  }, [showVol]);

  useEffect(() => {
    const { chart, candle, vol } = r.current;
    const cfg = MARKETS[sym];
    const [src, sec] = INTERVALS[iv];
    const pf = { type: 'price', precision: cfg.dp, minMove: 1 / 10 ** cfg.dp };

    candle.applyOptions({ priceFormat: pf });
    chart.timeScale().applyOptions({ secondsVisible: sec < 60 });

    // enabled indicator series
    const indSeries = inds.map((key) => ({
      key,
      series: INDICATORS[key].lines.map(([title, , color]) =>
        chart.addLineSeries({
          color, lineWidth: 1, priceFormat: pf, title,
          lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
        }),
      ),
    }));

    let bars = [];
    let ver = -1;
    const load = () => {
      ver = ex.mk[sym].dataVer;
      bars = aggregate(ex.mk[sym][src], sec);
      candle.setData(bars.map(toCandle));
      vol.setData(bars.map(toVol));
      for (const { key, series } of indSeries) calc(key, bars).forEach((d, i) => series[i].setData(d));
      chart.timeScale().setVisibleLogicalRange({ from: bars.length - 120, to: bars.length + 8 });
    };
    load();
    r.current.sig = '';

    const syncLines = () => {
      const pos = ex.acc.positions[sym];
      const ords = ex.acc.orders.filter((o) => o.sym === sym);
      const alerts = ex.alerts.filter((a) => a.sym === sym);
      const sig = JSON.stringify([
        pos && [pos.side, pos.entry, pos.qty, pos.margin, pos.tp, pos.sl],
        ords.map((o) => o.id),
        alerts.map((a) => a.id),
      ]);
      if (sig === r.current.sig) return;
      r.current.sig = sig;
      r.current.lines.forEach((l) => candle.removePriceLine(l));
      const lines = [];
      const add = (price, color, title, lineStyle = LineStyle.Dashed) =>
        lines.push(candle.createPriceLine({ price, color, title, lineWidth: 1, lineStyle, axisLabelVisible: true }));
      if (pos) {
        add(pos.entry, '#7c5cff', `${pos.side.toUpperCase()} ${pos.qty.toFixed(cfg.qdp)}`, LineStyle.Solid);
        add(liqPrice(pos), '#f0b90b', 'Liq.');
        if (pos.tp != null) add(pos.tp, UP, 'TP');
        if (pos.sl != null) add(pos.sl, DOWN, 'SL');
      }
      ords.forEach((o) => add(o.price, '#00d1ff', `${o.type === 'stop' ? 'Stop' : 'Limit'} ${o.side.toUpperCase()}`));
      alerts.forEach((a) => add(a.price, '#ff9800', '🔔', LineStyle.Dotted));
      r.current.lines = lines;
    };

    const onTick = () => {
      if (ex.mk[sym].dataVer !== ver) load();
      const b = lastBar(ex.mk[sym][src], sec);
      if (b) {
        candle.update(toCandle(b));
        vol.update(toVol(b));
        if (bars.length && bars[bars.length - 1].time === b.time) bars[bars.length - 1] = b;
        else bars.push(b);
        // update the last indicator point (computed on the tail only, for speed)
        if (indSeries.length) {
          const tail = bars.slice(-300);
          for (const { key, series } of indSeries) {
            calc(key, tail).forEach((d, i) => d.length && series[i].update(d[d.length - 1]));
          }
        }
      }
      syncLines();
    };

    syncLines();
    const unsub = ex.subscribe(onTick);
    return () => {
      unsub();
      indSeries.forEach(({ series }) => series.forEach((s) => chart.removeSeries(s)));
    };
  }, [sym, iv, inds]);

  return <div className="chart" ref={el} />;
}

export default memo(Chart);
