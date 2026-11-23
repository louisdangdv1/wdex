import { memo, useEffect, useRef, useState } from 'react';
import {
  createChart, createSeriesMarkers, createTextWatermark,
  CandlestickSeries, BarSeries, LineSeries, AreaSeries, BaselineSeries, HistogramSeries,
  CrosshairMode, LineStyle, PriceScaleMode,
} from 'lightweight-charts';
import { ex, MARKETS, INTERVALS, aggregate, lastBar, liqPrice } from '../engine/exchange';
import { IND, heikinAshi, haNext } from '../chart/indicators';
import { fmt, fmtCompact } from '../utils';

// chart uses UTC -> shift by the local offset so the axis shows local time
const TZ = -new Date().getTimezoneOffset() * 60;
const UP = '#16c784';
const DOWN = '#ea3943';
const DRAW = '#2962ff';
const FIB = [
  [0, '#8a93a6'], [0.236, '#ef5350'], [0.382, '#ff9800'], [0.5, '#4caf50'],
  [0.618, '#26a69a'], [0.786, '#2196f3'], [1, '#8a93a6'],
];

export const CHART_TYPES = [
  ['candles', 'Candles', '🕯'],
  ['hollow', 'Hollow candles', '◫'],
  ['heikin', 'Heikin Ashi', '▥'],
  ['bars', 'Bars', '╪'],
  ['line', 'Line', '∿'],
  ['area', 'Area', '◭'],
  ['baseline', 'Baseline', '⇅'],
];
const TOOLS = [
  [null, '↖', 'Cursor'],
  ['hline', '─', 'Horizontal line'],
  ['trend', '╱', 'Trend line'],
  ['fib', '≡', 'Fib retracement'],
];
const isOHLC = (t) => ['candles', 'hollow', 'heikin', 'bars'].includes(t);

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch { /* ignore */ }
  },
};

function addMainSeries(chart, type, pf) {
  const base = { priceFormat: pf };
  switch (type) {
    case 'bars':
      return chart.addSeries(BarSeries, { ...base, upColor: UP, downColor: DOWN, thinBars: false });
    case 'line':
      return chart.addSeries(LineSeries, { ...base, color: DRAW, lineWidth: 2 });
    case 'area':
      return chart.addSeries(AreaSeries, { ...base, lineColor: DRAW, topColor: 'rgba(41,98,255,.35)', bottomColor: 'rgba(41,98,255,0)', lineWidth: 2 });
    case 'baseline':
      return chart.addSeries(BaselineSeries, {
        ...base, topLineColor: UP, bottomLineColor: DOWN,
        topFillColor1: 'rgba(22,199,132,.28)', topFillColor2: 'rgba(22,199,132,.04)',
        bottomFillColor1: 'rgba(234,57,67,.04)', bottomFillColor2: 'rgba(234,57,67,.28)',
      });
    case 'hollow':
      return chart.addSeries(CandlestickSeries, {
        ...base, upColor: 'rgba(0,0,0,0)', downColor: DOWN, borderVisible: true,
        borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN,
      });
    default:
      return chart.addSeries(CandlestickSeries, {
        ...base, upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false,
      });
  }
}

function Chart({ sym, iv, setIv }) {
  const el = useRef(null);
  const legendRef = useRef(null);
  const subLegendRef = useRef(null);
  const r = useRef({ drawings: store.get('wdex.drawings', {}) });

  const [type, setType] = useState(() => store.get('wdex.chartType', 'candles'));
  const [inds, setInds] = useState(() => store.get('wdex.inds', ['vol', 'ma']));
  const [tool, setTool] = useState(null);
  const [log, setLog] = useState(false);
  const [magnet, setMagnet] = useState(false);
  const [full, setFull] = useState(false);
  const [showTrades, setShowTrades] = useState(true);
  const [menu, setMenu] = useState(null);
  const [hint, setHint] = useState('');

  const toolRef = useRef(tool);
  toolRef.current = tool;
  const logRef = useRef(log);
  logRef.current = log;

  useEffect(() => store.set('wdex.chartType', type), [type]);
  useEffect(() => store.set('wdex.inds', inds), [inds]);

  // ---------- create the chart once ----------
  useEffect(() => {
    const chart = createChart(el.current, {
      autoSize: true,
      layout: {
        background: { color: '#141821' },
        textColor: '#8a93a6',
        fontSize: 11,
        panes: { separatorColor: '#242b3a', separatorHoverColor: 'rgba(124,92,255,.35)', enableResize: true },
      },
      grid: { vertLines: { color: '#1c2230' }, horzLines: { color: '#1c2230' } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#5d6679', labelBackgroundColor: '#2a3142' },
        horzLine: { color: '#5d6679', labelBackgroundColor: '#2a3142' },
      },
      rightPriceScale: { borderColor: '#242b3a' },
      timeScale: { borderColor: '#242b3a', timeVisible: true, secondsVisible: true, rightOffset: 10 },
    });
    r.current.chart = chart;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        r.current.cancelPending?.();
        setTool(null);
        setFull(false);
        setMenu(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // React cleans this effect before the data effect below on unmount,
      // so flag the chart as gone and let that cleanup skip chart calls.
      r.current.disposed = true;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    r.current.chart.applyOptions({ crosshair: { mode: magnet ? CrosshairMode.Magnet : CrosshairMode.Normal } });
  }, [magnet]);

  useEffect(() => {
    r.current.main?.priceScale().applyOptions({ mode: log ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal });
  }, [log]);

  useEffect(() => {
    if (!tool) {
      r.current.cancelPending?.();
      setHint('');
    } else {
      setHint(tool === 'hline' ? 'Click to place a horizontal line' : 'Click the first point');
    }
  }, [tool]);

  // ---------- series, data and live updates ----------
  useEffect(() => {
    const R = r.current;
    const { chart } = R;
    const cfg = MARKETS[sym];
    const [src, sec] = INTERVALS[iv];
    const key = `${sym}|${iv}`;
    const pf = { type: 'price', precision: cfg.dp, minMove: 1 / 10 ** cfg.dp };
    const showVol = inds.includes('vol');

    chart.timeScale().applyOptions({ secondsVisible: sec < 60 });

    // main price series
    const main = addMainSeries(chart, type, pf);
    main.priceScale().applyOptions({
      scaleMargins: { top: 0.08, bottom: showVol ? 0.2 : 0.06 },
      mode: logRef.current ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
    R.main = main;

    // volume (overlay at the bottom of the main pane)
    let volS = null;
    if (showVol) {
      volS = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false }, 0);
      volS.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    }

    // indicators
    let pane = 0;
    const indS = inds
      .filter((k) => k !== 'vol' && IND[k])
      .map((k) => {
        const d = IND[k];
        const p = d.group === 'osc' ? ++pane : 0;
        const ipf = d.precision != null ? { type: 'price', precision: d.precision, minMove: 1 / 10 ** d.precision } : pf;
        const series = d.lines.map(([title, color, kind]) =>
          kind === 'hist'
            ? chart.addSeries(HistogramSeries, { color, priceFormat: ipf, lastValueVisible: false, priceLineVisible: false }, p)
            : chart.addSeries(
                LineSeries,
                {
                  color, lineWidth: kind === 'colored' ? 2 : 1, priceFormat: ipf,
                  lastValueVisible: d.group === 'osc', priceLineVisible: false, crosshairMarkerVisible: false,
                  ...(kind === 'dots' ? { lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 1.6 } : {}),
                },
                p,
              ),
        );
        for (const v of d.levels || []) {
          series[0].createPriceLine({ price: v, color: '#5d6679', lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: false });
        }
        return { k, d, series, data: [] };
      });

    const panes = chart.panes();
    if (panes.length > 1) {
      panes[0].setStretchFactor(3);
      for (let i = 1; i < panes.length; i++) panes[i].setStretchFactor(1);
    }

    const watermark = createTextWatermark(chart.panes()[0], {
      horzAlign: 'center',
      vertAlign: 'center',
      lines: [
        { text: sym, color: 'rgba(138,147,166,0.07)', fontSize: 64, fontStyle: 'bold' },
        { text: `${iv} · WPEPE DEMO`, color: 'rgba(138,147,166,0.07)', fontSize: 22 },
      ],
    });
    const markers = createSeriesMarkers(main, []);

    // ---------- data ----------
    let bars = [];
    let ha = [];
    let ver = -1;
    const shift = (b) => ({ ...b, time: b.time + TZ });
    const toMain = (b) => (isOHLC(type) ? { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close } : { time: b.time, value: b.close });
    const volPt = (b) => ({ time: b.time, value: b.volume, color: b.close >= b.open ? 'rgba(22,199,132,.35)' : 'rgba(234,57,67,.35)' });

    const load = (initial) => {
      ver = ex.mk[sym].dataVer;
      bars = aggregate(ex.mk[sym][src], sec).map(shift);
      if (type === 'heikin') {
        ha = heikinAshi(bars);
        main.setData(ha);
      } else {
        main.setData(bars.map(toMain));
      }
      if (type === 'baseline') {
        main.applyOptions({ baseValue: { type: 'price', price: bars[Math.max(0, bars.length - 150)]?.close ?? 0 } });
      }
      volS?.setData(bars.map(volPt));
      for (const s of indS) {
        s.data = s.d.calc(bars);
        s.data.forEach((d, i) => s.series[i].setData(d));
      }
      if (initial && R.lastKey === key && R.savedRange) chart.timeScale().setVisibleLogicalRange(R.savedRange);
      else chart.timeScale().setVisibleLogicalRange({ from: bars.length - 150, to: bars.length + 10 });
      R.barsLen = bars.length;
    };
    load(true);

    // ---------- legend ----------
    let hoverIdx = null;
    const fp = (v) => (v == null ? '–' : fmt(v, cfg.dp));
    const valueAt = (s, li, i) => {
      const arr = s.data[li];
      const j = arr.length - 1 - (bars.length - 1 - i);
      return j >= 0 ? arr[j].value : null;
    };
    const renderLegend = () => {
      const i = hoverIdx ?? bars.length - 1;
      const b = bars[i];
      if (!b || !legendRef.current) return;
      const prev = bars[i - 1];
      const ref = prev ? prev.close : b.open;
      const chg = b.close - ref;
      const c = b.close >= b.open ? 'up' : 'down';
      const now = ex.now() / 1000;
      const remain = Math.max(0, Math.ceil((Math.floor(now / sec) + 1) * sec - now));
      const cd = remain >= 3600
        ? `${Math.floor(remain / 3600)}:${String(Math.floor((remain % 3600) / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`
        : `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`;
      let html =
        `<div class="lg-row lg-main"><b>${sym}</b><span class="muted">· ${iv} · WPEPE</span>` +
        `<span><i>O</i><em class="${c}">${fp(b.open)}</em></span>` +
        `<span><i>H</i><em class="${c}">${fp(b.high)}</em></span>` +
        `<span><i>L</i><em class="${c}">${fp(b.low)}</em></span>` +
        `<span><i>C</i><em class="${c}">${fp(b.close)}</em></span>` +
        `<em class="${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${fmt(chg, cfg.dp)} (${chg >= 0 ? '+' : ''}${((chg / ref) * 100).toFixed(2)}%)</em>` +
        (showVol ? `<span><i>Vol</i>${fmtCompact(b.volume)}</span>` : '') +
        (hoverIdx == null ? `<span class="muted">⏱ ${cd}</span>` : '') +
        `</div>`;
      for (const s of indS) {
        if (s.d.group !== 'overlay') continue;
        html += `<div class="lg-row"><span class="muted">${s.d.name}</span>` +
          s.d.lines.map(([n, color], li) => `<span style="color:${color}">${n} ${fp(valueAt(s, li, i))}</span>`).join('') +
          `</div>`;
      }
      legendRef.current.innerHTML = html;

      // legends of the sub panes, placed at the top of each pane
      if (subLegendRef.current) {
        const ps = chart.panes();
        let y = 0;
        const tops = ps.map((p) => {
          const t = y;
          y += p.getHeight() + 1;
          return t;
        });
        subLegendRef.current.innerHTML = indS
          .filter((s) => s.d.group === 'osc')
          .map((s, n) => {
            const prec = s.d.precision ?? cfg.dp;
            const vals = s.d.lines
              .map(([nm, color], li) => {
                const v = valueAt(s, li, i);
                return `<span style="color:${color}">${nm} ${v == null ? '–' : fmt(v, prec)}</span>`;
              })
              .join('');
            return `<div class="lg-row lg-sub" style="top:${(tops[n + 1] ?? 0) + 4}px"><span class="muted">${s.d.desc}</span>${vals}</div>`;
          })
          .join('');
      }
    };

    // ---------- position / order / alert price lines ----------
    let lines = [];
    let sig = '';
    const syncLines = () => {
      const pos = ex.acc.positions[sym];
      const ords = ex.acc.orders.filter((o) => o.sym === sym);
      const alerts = ex.alerts.filter((a) => a.sym === sym);
      const s = JSON.stringify([pos && [pos.side, pos.entry, pos.qty, pos.margin, pos.tp, pos.sl], ords.map((o) => o.id), alerts.map((a) => a.id)]);
      if (s === sig) return;
      sig = s;
      lines.forEach((l) => main.removePriceLine(l));
      lines = [];
      const add = (price, color, title, lineStyle = LineStyle.Dashed) =>
        lines.push(main.createPriceLine({ price, color, title, lineWidth: 1, lineStyle, axisLabelVisible: true }));
      if (pos) {
        add(pos.entry, '#7c5cff', `${pos.side.toUpperCase()} ${pos.qty.toFixed(cfg.qdp)}`, LineStyle.Solid);
        add(liqPrice(pos), '#f0b90b', 'Liq.');
        if (pos.tp != null) add(pos.tp, UP, 'TP');
        if (pos.sl != null) add(pos.sl, DOWN, 'SL');
      }
      ords.forEach((o) => add(o.price, '#00d1ff', `${o.type === 'stop' ? 'Stop' : 'Limit'} ${o.side.toUpperCase()}`));
      alerts.forEach((a) => add(a.price, '#ff9800', '🔔', LineStyle.Dotted));
    };

    // ---------- buy / sell markers from the trade history ----------
    let mSig = '';
    const syncMarkers = () => {
      const h = ex.acc.history;
      const s = showTrades ? `${h.length}:${h[0]?.id ?? 0}:${bars[0]?.time}` : 'off';
      if (s === mSig) return;
      mSig = s;
      if (!showTrades) return markers.setMarkers([]);
      const first = bars[0]?.time ?? 0;
      const ms = [];
      for (const x of h) {
        if (x.sym !== sym || !['Open', 'Close', 'Liquidation'].includes(x.action)) continue;
        const t = Math.floor(x.time / 1000 / sec) * sec + TZ;
        if (t < first) continue;
        if (x.action === 'Liquidation') {
          ms.push({ time: t, position: x.side === 'long' ? 'aboveBar' : 'belowBar', color: '#f0b90b', shape: 'circle', text: 'LIQ' });
        } else {
          const buy = (x.action === 'Open') === (x.side === 'long');
          ms.push({ time: t, position: buy ? 'belowBar' : 'aboveBar', color: buy ? UP : DOWN, shape: buy ? 'arrowUp' : 'arrowDown', text: buy ? 'B' : 'S' });
        }
      }
      ms.sort((a, b) => a.time - b.time);
      markers.setMarkers(ms);
    };

    // ---------- drawings ----------
    let drawObjs = [];
    const snap = (t) => Math.floor(t / sec) * sec + TZ;
    const linePts = (p1, p2) => {
      const a = { time: snap(p1.time), value: p1.price };
      const b = { time: snap(p2.time), value: p2.price };
      if (a.time === b.time) return [b];
      return a.time < b.time ? [a, b] : [b, a];
    };
    const thinLine = (extra = {}) =>
      chart.addSeries(LineSeries, {
        color: DRAW, lineWidth: 2, lastValueVisible: false, priceLineVisible: false,
        crosshairMarkerVisible: false, autoscaleInfoProvider: () => null, priceFormat: pf, ...extra,
      }, 0);
    const renderDrawings = () => {
      drawObjs.forEach((o) => (o.series ? chart.removeSeries(o.series) : main.removePriceLine(o.line)));
      drawObjs = [];
      for (const d of R.drawings[sym] || []) {
        if (d.type === 'hline') {
          drawObjs.push({ line: main.createPriceLine({ price: d.price, color: DRAW, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: '' }) });
        } else if (d.type === 'trend') {
          const s = thinLine({ pointMarkersVisible: true, pointMarkersRadius: 3 });
          s.setData(linePts(d.p1, d.p2));
          drawObjs.push({ series: s });
        } else if (d.type === 'fib') {
          const diff = d.p2.price - d.p1.price;
          for (const [lvl, color] of FIB) {
            const price = d.p2.price - diff * lvl;
            drawObjs.push({ line: main.createPriceLine({ price, color, lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: String(lvl) }) });
          }
          const s = thinLine({ lineWidth: 1, lineStyle: LineStyle.Dashed, color: 'rgba(138,147,166,.6)' });
          s.setData(linePts(d.p1, d.p2));
          drawObjs.push({ series: s });
        }
      }
    };
    R.renderDrawings = renderDrawings;
    renderDrawings();

    let pending = null;
    let pendingPx = null;
    let preview = null;
    const cancelPending = () => {
      pending = null;
      pendingPx = null;
      if (preview) chart.removeSeries(preview);
      preview = null;
    };
    R.cancelPending = cancelPending;
    const addDrawing = (d) => {
      R.drawings[sym] = [...(R.drawings[sym] || []), d];
      store.set('wdex.drawings', R.drawings);
      renderDrawings();
    };

    // native DOM clicks: the browser reports every click, even quick ones
    // that the chart library would merge into a double-click
    const onDomClick = (e) => {
      const rect = el.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const time = chart.timeScale().coordinateToTime(x);
      onClick({ point: { x, y }, time: time ?? undefined });
    };
    const onClick = (param) => {
      const t = toolRef.current;
      if (!t || !param.point || param.time == null) return;
      if (param.point.y > chart.panes()[0].getHeight()) return; // only draw on the price pane
      const price = main.coordinateToPrice(param.point.y);
      if (price == null) return;
      const p = { time: param.time - TZ, price };
      if (t === 'hline') {
        addDrawing({ type: 'hline', price });
        setTool(null);
        return;
      }
      // a quick second click arrives as a double-click; ignore it only if it hits the same spot
      if (pending && pendingPx && Math.hypot(param.point.x - pendingPx.x, param.point.y - pendingPx.y) < 5) return;
      if (!pending) {
        pending = p;
        pendingPx = { x: param.point.x, y: param.point.y };
        preview = thinLine({ lineWidth: 1, lineStyle: LineStyle.Dashed });
        setHint('Click the second point (Esc to cancel)');
        return;
      }
      addDrawing({ type: t, p1: pending, p2: p });
      cancelPending();
      setTool(null);
    };

    const findIdx = (time) => {
      let lo = 0, hi = bars.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (bars[mid].time === time) return mid;
        if (bars[mid].time < time) lo = mid + 1;
        else hi = mid - 1;
      }
      return null;
    };
    // updating series data re-fires crosshair events, so the drawing preview
    // is applied on the next animation frame instead of inside the handler
    let previewTarget = null;
    let previewRaf = 0;
    const flushPreview = () => {
      previewRaf = 0;
      if (pending && preview && previewTarget) preview.setData(linePts(pending, previewTarget));
    };
    const onMove = (param) => {
      hoverIdx = param.time == null || !param.point ? null : findIdx(param.time);
      if (pending && preview && param.point && param.time != null) {
        const price = main.coordinateToPrice(param.point.y);
        if (price != null) {
          previewTarget = { time: param.time - TZ, price };
          if (!previewRaf) previewRaf = requestAnimationFrame(flushPreview);
        }
      }
      renderLegend();
    };

    // ---------- live tick ----------
    const onTick = () => {
      if (ex.mk[sym].dataVer !== ver) load(false);
      const raw = lastBar(ex.mk[sym][src], sec);
      if (raw) {
        const b = shift(raw);
        if (bars.length && b.time < bars[bars.length - 1].time) return; // never go back in time
        const isNew = !bars.length || bars[bars.length - 1].time !== b.time;
        if (isNew) bars.push(b);
        else bars[bars.length - 1] = b;
        if (type === 'heikin') {
          const h = haNext(isNew ? ha[ha.length - 1] : ha[ha.length - 2], b);
          if (isNew) ha.push(h);
          else ha[ha.length - 1] = h;
          main.update(h);
        } else {
          main.update(toMain(b));
        }
        volS?.update(volPt(b));
        const tail = bars.length > 1000 ? bars.slice(-1000) : bars;
        for (const s of indS) {
          const res = s.d.calc(s.d.full ? bars : tail);
          res.forEach((arr, li) => {
            const p = arr[arr.length - 1];
            if (!p) return;
            const cur = s.data[li];
            if (cur.length && cur[cur.length - 1].time === p.time) cur[cur.length - 1] = p;
            else cur.push(p);
            s.series[li].update(p);
          });
        }
        R.barsLen = bars.length;
      }
      syncLines();
      syncMarkers();
      if (hoverIdx == null) renderLegend();
    };

    syncLines();
    syncMarkers();
    renderLegend();
    const host = el.current;
    host.addEventListener('click', onDomClick);
    chart.subscribeCrosshairMove(onMove);
    const unsub = ex.subscribe(onTick);

    return () => {
      unsub();
      host.removeEventListener('click', onDomClick);
      if (previewRaf) cancelAnimationFrame(previewRaf);
      R.main = null;
      R.renderDrawings = null;
      R.cancelPending = null;
      if (R.disposed) return; // chart already destroyed (component unmounting)
      chart.unsubscribeCrosshairMove(onMove);
      R.savedRange = chart.timeScale().getVisibleLogicalRange();
      R.lastKey = key;
      cancelPending();
      if (previewRaf) cancelAnimationFrame(previewRaf);
      markers.detach();
      watermark.detach();
      drawObjs.forEach((o) => o.series && chart.removeSeries(o.series));
      indS.forEach((s) => s.series.forEach((x) => chart.removeSeries(x)));
      if (volS) chart.removeSeries(volS);
      chart.removeSeries(main);
      R.main = null;
      R.renderDrawings = null;
    };
  }, [sym, iv, type, inds, showTrades]);

  // ---------- toolbar actions ----------
  const toggleInd = (k) => setInds((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
  const clearDrawings = (lastOnly) => {
    const R = r.current;
    const list = R.drawings[sym] || [];
    R.drawings[sym] = lastOnly ? list.slice(0, -1) : [];
    store.set('wdex.drawings', R.drawings);
    R.renderDrawings?.();
  };
  const screenshot = () => {
    const canvas = r.current.chart.takeScreenshot();
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `wdex-${sym}-${iv}-${Date.now()}.png`;
    a.click();
  };
  const resetView = () => {
    const { chart, main, barsLen = 0 } = r.current;
    chart.timeScale().setVisibleLogicalRange({ from: barsLen - 150, to: barsLen + 10 });
    main?.priceScale().applyOptions({ autoScale: true });
  };
  const curType = CHART_TYPES.find((t) => t[0] === type) || CHART_TYPES[0];
  const activeCount = inds.length;

  return (
    <div className={`chart-wrap ${full ? 'fullscreen' : ''}`}>
      <div className="chart-toolbar">
        {Object.keys(INTERVALS).map((k) => (
          <button key={k} className={k === iv ? 'active' : ''} onClick={() => setIv(k)}>{k}</button>
        ))}
        <span className="tb-sep" />

        <div className="dd">
          <button className="ind" title="Chart type" onClick={() => setMenu(menu === 'type' ? null : 'type')}>
            {curType[2]} <span className="caret">▾</span>
          </button>
          {menu === 'type' && (
            <div className="dd-menu">
              {CHART_TYPES.map(([k, label, icon]) => (
                <button key={k} className={`dd-item ${k === type ? 'active' : ''}`} onClick={() => { setType(k); setMenu(null); }}>
                  <span className="dd-icon">{icon}</span> {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="dd">
          <button className="ind" onClick={() => setMenu(menu === 'ind' ? null : 'ind')}>
            <b className="fx">ƒx</b> Indicators{activeCount ? ` (${activeCount})` : ''} <span className="caret">▾</span>
          </button>
          {menu === 'ind' && (
            <div className="dd-menu wide">
              {[['overlay', 'Overlays (on price)'], ['osc', 'Oscillators (separate pane)']].map(([g, title]) => (
                <div key={g}>
                  <div className="dd-title">{title}</div>
                  {Object.entries(IND)
                    .filter(([, d]) => d.group === g)
                    .map(([k, d]) => (
                      <label key={k} className="dd-item check-item">
                        <input type="checkbox" checked={inds.includes(k)} onChange={() => toggleInd(k)} />
                        <b>{d.name}</b>
                        <span className="muted">{d.desc}</span>
                      </label>
                    ))}
                </div>
              ))}
              <div className="dd-foot">
                <button className="mini" onClick={() => setInds([])}>Remove all</button>
              </div>
            </div>
          )}
        </div>

        <span className="tb-sep" />
        <button className={log ? 'active ind' : 'ind'} title="Logarithmic price scale" onClick={() => setLog((v) => !v)}>Log</button>
        <button className={magnet ? 'active ind' : 'ind'} title="Magnet: snap crosshair to OHLC" onClick={() => setMagnet((v) => !v)}>🧲</button>
        <button className={showTrades ? 'active ind' : 'ind'} title="Show my buys / sells on the chart" onClick={() => setShowTrades((v) => !v)}>B/S</button>
        <span className="spacer" />
        <button className="ind" title="Reset view" onClick={resetView}>⟲</button>
        <button className="ind" title="Take a screenshot" onClick={screenshot}>📷</button>
        <button className="ind" title={full ? 'Exit fullscreen (Esc)' : 'Fullscreen'} onClick={() => setFull((v) => !v)}>{full ? '🗗' : '⛶'}</button>
      </div>

      <div className="chart-body">
        <div className="draw-bar">
          {TOOLS.map(([k, icon, title]) => (
            <button key={title} className={tool === k ? 'active' : ''} title={title} onClick={() => setTool(k)}>{icon}</button>
          ))}
          <div className="draw-sep" />
          <button title="Undo last drawing" onClick={() => clearDrawings(true)}>↶</button>
          <button title="Remove all drawings" onClick={() => clearDrawings(false)}>🗑</button>
        </div>
        <div className={`chart-area ${tool ? 'drawing' : ''}`}>
          <div className="chart" ref={el} />
          <div className="legend" ref={legendRef} />
          <div className="sub-legends" ref={subLegendRef} />
          {hint && <div className="draw-hint">{hint}</div>}
        </div>
      </div>
      {menu && <div className="dd-backdrop" onClick={() => setMenu(null)} />}
    </div>
  );
}

export default memo(Chart);
