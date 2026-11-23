// =====================================================================
//  Technical indicators. Every function takes bars sorted by time
//  ({ time, open, high, low, close, volume }) and returns chart points.
// =====================================================================

const pt = (time, value) => ({ time, value });

function emaArr(vals, n) {
  const k = 2 / (n + 1);
  const out = new Array(vals.length);
  let e = null;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v == null) {
      out[i] = null;
      continue;
    }
    e = e == null ? v : v * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

/** Wilder-smoothed Average True Range, aligned with bars (null during warm-up) */
function atrArr(b, n) {
  const out = new Array(b.length).fill(null);
  let atr = 0;
  for (let i = 1; i < b.length; i++) {
    const tr = Math.max(b[i].high - b[i].low, Math.abs(b[i].high - b[i - 1].close), Math.abs(b[i].low - b[i - 1].close));
    if (i <= n) {
      atr += tr;
      if (i === n) out[i] = atr /= n;
    } else {
      atr = (atr * (n - 1) + tr) / n;
      out[i] = atr;
    }
  }
  return out;
}

export function sma(b, n) {
  const out = [];
  let s = 0;
  for (let i = 0; i < b.length; i++) {
    s += b[i].close;
    if (i >= n) s -= b[i - n].close;
    if (i >= n - 1) out.push(pt(b[i].time, s / n));
  }
  return out;
}

export function ema(b, n) {
  const e = emaArr(b.map((x) => x.close), n);
  const out = [];
  for (let i = n - 1; i < b.length; i++) out.push(pt(b[i].time, e[i]));
  return out;
}

export function boll(b, n = 20, mult = 2) {
  const up = [], mb = [], dn = [];
  for (let i = n - 1; i < b.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += b[j].close;
    const mean = s / n;
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (b[j].close - mean) ** 2;
    const sd = Math.sqrt(v / n);
    up.push(pt(b[i].time, mean + mult * sd));
    mb.push(pt(b[i].time, mean));
    dn.push(pt(b[i].time, mean - mult * sd));
  }
  return [up, mb, dn];
}

/** VWAP that resets every day (bar times are already in local time) */
export function vwap(b) {
  const out = [];
  let day = null, pv = 0, vol = 0;
  for (const x of b) {
    const d = Math.floor(x.time / 86400);
    if (d !== day) {
      day = d;
      pv = 0;
      vol = 0;
    }
    const tp = (x.high + x.low + x.close) / 3;
    pv += tp * x.volume;
    vol += x.volume;
    out.push(pt(x.time, vol ? pv / vol : tp));
  }
  return out;
}

/** Parabolic SAR */
export function sar(b, step = 0.02, max = 0.2) {
  if (b.length < 3) return [];
  const out = [];
  let up = b[1].close >= b[0].close;
  let ep = up ? b[0].high : b[0].low;
  let s = up ? b[0].low : b[0].high;
  let af = step;
  for (let i = 1; i < b.length; i++) {
    s += af * (ep - s);
    const p1 = b[i - 1], p2 = b[Math.max(0, i - 2)];
    if (up) {
      s = Math.min(s, p1.low, p2.low);
      if (b[i].low < s) {
        up = false; s = ep; ep = b[i].low; af = step;
      } else if (b[i].high > ep) {
        ep = b[i].high; af = Math.min(af + step, max);
      }
    } else {
      s = Math.max(s, p1.high, p2.high);
      if (b[i].high > s) {
        up = true; s = ep; ep = b[i].high; af = step;
      } else if (b[i].low < ep) {
        ep = b[i].low; af = Math.min(af + step, max);
      }
    }
    out.push({ time: b[i].time, value: s, color: up ? '#16c784' : '#ea3943' });
  }
  return out;
}

/** SuperTrend (ATR period, multiplier); points are colored by trend */
export function supertrend(b, n = 10, mult = 3) {
  const atr = atrArr(b, n);
  const out = [];
  let fub = null, flb = null, upTrend = true;
  for (let i = n; i < b.length; i++) {
    const hl2 = (b[i].high + b[i].low) / 2;
    const ub = hl2 + mult * atr[i];
    const lb = hl2 - mult * atr[i];
    const pc = b[i - 1].close;
    fub = fub == null || ub < fub || pc > fub ? ub : fub;
    flb = flb == null || lb > flb || pc < flb ? lb : flb;
    if (upTrend && b[i].close < flb) upTrend = false;
    else if (!upTrend && b[i].close > fub) upTrend = true;
    out.push({ time: b[i].time, value: upTrend ? flb : fub, color: upTrend ? '#16c784' : '#ea3943' });
  }
  return out;
}

export function rsi(b, n = 14) {
  const out = [];
  let ag = 0, al = 0;
  const val = () => (al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  for (let i = 1; i < b.length; i++) {
    const ch = b[i].close - b[i - 1].close;
    const g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= n) {
      ag += g;
      al += l;
      if (i === n) {
        ag /= n;
        al /= n;
        out.push(pt(b[i].time, val()));
      }
    } else {
      ag = (ag * (n - 1) + g) / n;
      al = (al * (n - 1) + l) / n;
      out.push(pt(b[i].time, val()));
    }
  }
  return out;
}

export function macd(b, fast = 12, slow = 26, signal = 9) {
  const c = b.map((x) => x.close);
  const ef = emaArr(c, fast), es = emaArr(c, slow);
  const start = slow - 1;
  const m = [];
  for (let i = start; i < b.length; i++) m.push(ef[i] - es[i]);
  const sg = emaArr(m, signal);
  const line = [], sig = [], hist = [];
  let prev = 0;
  for (let j = 0; j < m.length; j++) {
    const t = b[start + j].time;
    line.push(pt(t, m[j]));
    if (j >= signal - 1) {
      const h = m[j] - sg[j];
      sig.push(pt(t, sg[j]));
      const color = h >= 0 ? (h >= prev ? '#26a69a' : '#b2dfdb') : h < prev ? '#ef5350' : '#ffcdd2';
      hist.push({ time: t, value: h, color });
      prev = h;
    }
  }
  return [line, sig, hist];
}

export function stoch(b, n = 14, kSmooth = 3, dSmooth = 3) {
  const raw = [];
  for (let i = n - 1; i < b.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      if (b[j].high > hh) hh = b[j].high;
      if (b[j].low < ll) ll = b[j].low;
    }
    raw.push({ time: b[i].time, v: hh === ll ? 50 : ((b[i].close - ll) / (hh - ll)) * 100 });
  }
  const smooth = (arr, n2) => {
    const out = [];
    let s = 0;
    for (let i = 0; i < arr.length; i++) {
      s += arr[i].v;
      if (i >= n2) s -= arr[i - n2].v;
      if (i >= n2 - 1) out.push({ time: arr[i].time, v: s / n2 });
    }
    return out;
  };
  const k = smooth(raw, kSmooth);
  const d = smooth(k, dSmooth);
  return [k.map((x) => pt(x.time, x.v)), d.map((x) => pt(x.time, x.v))];
}

export function atr(b, n = 14) {
  const a = atrArr(b, n);
  const out = [];
  for (let i = 0; i < b.length; i++) if (a[i] != null) out.push(pt(b[i].time, a[i]));
  return out;
}

// ---------------------------------------------------------- Heikin Ashi
export function haNext(prev, x) {
  const close = (x.open + x.high + x.low + x.close) / 4;
  const open = prev ? (prev.open + prev.close) / 2 : (x.open + x.close) / 2;
  return { time: x.time, open, close, high: Math.max(x.high, open, close), low: Math.min(x.low, open, close) };
}
export function heikinAshi(bars) {
  const out = [];
  for (const x of bars) out.push(haNext(out[out.length - 1], x));
  return out;
}

// ---------------------------------------------------------- catalogue
// lines: [name, color, kind?]  kind: 'hist' | 'dots' | 'colored'
// full: needs the whole history on live updates (path-dependent)
export const IND = {
  vol: { name: 'Volume', group: 'overlay', desc: 'Trading volume' },
  ma: { name: 'MA', group: 'overlay', desc: 'Moving Average 7 / 25 / 99', lines: [['MA7', '#f0b90b'], ['MA25', '#e040fb'], ['MA99', '#00d1ff']], calc: (b) => [sma(b, 7), sma(b, 25), sma(b, 99)] },
  ema: { name: 'EMA', group: 'overlay', desc: 'Exponential MA 12 / 26', lines: [['EMA12', '#ff9800'], ['EMA26', '#4caf50']], calc: (b) => [ema(b, 12), ema(b, 26)] },
  boll: { name: 'BOLL', group: 'overlay', desc: 'Bollinger Bands 20, 2', lines: [['UP', '#7c5cff'], ['MB', '#8a93a6'], ['DN', '#7c5cff']], calc: (b) => boll(b) },
  vwap: { name: 'VWAP', group: 'overlay', desc: 'Volume Weighted Avg Price (daily)', full: true, lines: [['VWAP', '#ff4081']], calc: (b) => [vwap(b)] },
  sar: { name: 'SAR', group: 'overlay', desc: 'Parabolic SAR 0.02, 0.2', full: true, lines: [['SAR', '#00e5ff', 'dots']], calc: (b) => [sar(b)] },
  st: { name: 'SuperTrend', group: 'overlay', desc: 'SuperTrend 10, 3', full: true, lines: [['ST', '#16c784', 'colored']], calc: (b) => [supertrend(b)] },
  rsi: { name: 'RSI', group: 'osc', desc: 'Relative Strength Index 14', precision: 2, levels: [70, 30], full: true, lines: [['RSI14', '#b388ff']], calc: (b) => [rsi(b)] },
  macd: { name: 'MACD', group: 'osc', desc: 'MACD 12, 26, 9', full: true, lines: [['MACD', '#2196f3'], ['SIGNAL', '#ff9800'], ['HIST', '#26a69a', 'hist']], calc: (b) => macd(b) },
  stoch: { name: 'Stoch', group: 'osc', desc: 'Stochastic 14, 3, 3', precision: 2, levels: [80, 20], lines: [['%K', '#2196f3'], ['%D', '#ff9800']], calc: (b) => stoch(b) },
  atr: { name: 'ATR', group: 'osc', desc: 'Average True Range 14', full: true, lines: [['ATR14', '#ef5350']], calc: (b) => [atr(b)] },
};
