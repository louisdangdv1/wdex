// =====================================================================
//  WPEPE engine: controllable price simulator + futures matching
//  (isolated margin, one-way mode, market/limit/stop, TP/SL, liquidation)
// =====================================================================

export const MARKETS = {
  BTCUSDT: { base: 'BTC', price: 65000, dp: 2, qdp: 4, vol: 150000 },
  ETHUSDT: { base: 'ETH', price: 3200, dp: 2, qdp: 3, vol: 80000 },
  SOLUSDT: { base: 'SOL', price: 150, dp: 2, qdp: 2, vol: 30000 },
  BNBUSDT: { base: 'BNB', price: 580, dp: 2, qdp: 2, vol: 12000 },
  DOGEUSDT: { base: 'DOGE', price: 0.16, dp: 5, qdp: 0, vol: 15000 },
  XRPUSDT: { base: 'XRP', price: 0.6, dp: 4, qdp: 1, vol: 20000 },
  ADAUSDT: { base: 'ADA', price: 0.45, dp: 4, qdp: 0, vol: 8000 },
  AVAXUSDT: { base: 'AVAX', price: 30, dp: 2, qdp: 2, vol: 6000 },
  LINKUSDT: { base: 'LINK', price: 15, dp: 2, qdp: 2, vol: 6000 },
  LTCUSDT: { base: 'LTC', price: 80, dp: 2, qdp: 3, vol: 5000 },
  TRXUSDT: { base: 'TRX', price: 0.2, dp: 4, qdp: 0, vol: 4000 },
};
export const SYMBOLS = Object.keys(MARKETS);

// interval -> [candle source, seconds]
export const INTERVALS = {
  '1s': ['c1s', 1],
  '5s': ['c1s', 5],
  '15s': ['c1s', 15],
  '1m': ['c1m', 60],
  '5m': ['c1m', 300],
  '15m': ['c1m', 900],
  '30m': ['c1m', 1800],
  '1h': ['c1m', 3600],
  '2h': ['c1m', 7200],
  '4h': ['c1m', 14400],
};

export const FEE_TAKER = 0.0005;
export const FEE_MAKER = 0.0002;
export const MMR = 0.005; // maintenance margin rate
export const START_BALANCE = 10000;

const TICK_MS = 250;
const TICKS_PER_MIN = 60000 / TICK_MS;
const MAX_1S = 7200; // 2 hours of 1s candles
const MAX_1M = 4320; // 3 days of 1m candles
const STORE_KEY = 'vibedex-demo-v1';

// Real price sources (public market data, no API key needed)
const REST_URLS = ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3'];
const WS_URLS = ['wss://data-stream.binance.vision/stream', 'wss://stream.binance.com:9443/stream'];

const FUNDING_MS = 8 * 3600 * 1000; // funding every 8 hours (00:00, 08:00, 16:00 UTC)
export const nextFundingTime = (now = Date.now()) => Math.floor(now / FUNDING_MS) * FUNDING_MS + FUNDING_MS;

const moveToward =(a, b, step) => (a < b ? Math.min(a + step, b) : Math.max(a - step, b));
const toCandles = (rows) =>
  rows.map((r) => ({ time: r[0] / 1000, open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[7] }));

async function fetchJson(path) {
  for (const base of REST_URLS) {
    try {
      const res = await fetch(base + path);
      if (res.ok) return await res.json();
    } catch { /* try next source */ }
  }
  throw new Error('Failed to load real price data');
}

// ---------------------------------------------------------------- utils
const randn = () => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
export const roundTo = (x, dp) => Math.round(x * 10 ** dp) / 10 ** dp;

/** Generate candles backwards in time, ending exactly at endPrice */
function genBack(endPrice, endTime, n, step, sigma, dp, volBase) {
  const out = new Array(n);
  let close = endPrice;
  for (let i = n - 1; i >= 0; i--) {
    const open = close / (1 + randn() * sigma);
    const high = Math.max(open, close) * (1 + Math.abs(randn()) * sigma * 0.6);
    const low = Math.min(open, close) * (1 - Math.abs(randn()) * sigma * 0.6);
    out[i] = {
      time: endTime - (n - 1 - i) * step,
      open: roundTo(open, dp),
      high: roundTo(high, dp),
      low: roundTo(low, dp),
      close: roundTo(close, dp),
      volume: volBase * (0.3 + Math.random()) * (1 + Math.abs(close - open) / close / sigma),
    };
    close = open;
  }
  return out;
}

/** Aggregate small candles into a larger interval */
export function aggregate(arr, sec, from = 0) {
  const out = [];
  let cur = null;
  for (let i = from; i < arr.length; i++) {
    const c = arr[i];
    const t = Math.floor(c.time / sec) * sec;
    if (!cur || cur.time !== t) {
      cur = { time: t, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
      out.push(cur);
    } else {
      if (c.high > cur.high) cur.high = c.high;
      if (c.low < cur.low) cur.low = c.low;
      cur.close = c.close;
      cur.volume += c.volume;
    }
  }
  return out;
}

/** Last (in-progress) candle of interval `sec` */
export function lastBar(arr, sec) {
  if (!arr.length) return null;
  const bucket = Math.floor(arr[arr.length - 1].time / sec) * sec;
  let i = arr.length - 1;
  while (i > 0 && arr[i - 1].time >= bucket) i--;
  return aggregate(arr, sec, i)[0];
}

function pushCandle(arr, t, p, v, max) {
  const last = arr[arr.length - 1];
  if (last && t < last.time) t = last.time; // never create a candle in the past
  if (last && last.time === t) {
    if (p > last.high) last.high = p;
    if (p < last.low) last.low = p;
    last.close = p;
    last.volume += v;
  } else {
    const o = last ? last.close : p;
    arr.push({ time: t, open: o, high: Math.max(o, p), low: Math.min(o, p), close: p, volume: v });
    if (arr.length > max) arr.splice(0, arr.length - max);
  }
}

function genBook(price, cfg) {
  const tick = Math.max(10 ** -cfg.dp, roundTo(price * 0.00005, cfg.dp));
  const asks = [], bids = [];
  let ta = 0, tb = 0;
  for (let i = 0; i < 16; i++) {
    const qa = (cfg.vol / price) * (0.02 + Math.random() * 0.25) * (1 + i * 0.15);
    const qb = (cfg.vol / price) * (0.02 + Math.random() * 0.25) * (1 + i * 0.15);
    ta += qa; tb += qb;
    asks.push({ price: roundTo(price + tick * (i + 1), cfg.dp), qty: qa, total: ta });
    bids.push({ price: roundTo(price - tick * (i + 1), cfg.dp), qty: qb, total: tb });
  }
  return { asks, bids };
}

function buildMarket(sym, price) {
  const cfg = MARKETS[sym];
  const now = Math.floor(Date.now() / 1000);
  const start1s = Math.floor((now - MAX_1S) / 60) * 60 + 60; // align to minute
  const n1s = now - start1s;
  const c1s = genBack(price, now - 1, n1s, 1, 0.00025, cfg.dp, cfg.vol);
  const older = genBack(c1s[0].open, start1s - 60, MAX_1M - Math.ceil(n1s / 60), 60, 0.0022, cfg.dp, cfg.vol * 60);
  const c1m = older.concat(aggregate(c1s, 60));
  return { price, dir: 1, c1s, c1m, trades: [], book: genBook(price, cfg), dataVer: 0, realHistory: false };
}

export function liqPrice(pos) {
  const { entry, qty, margin } = pos;
  if (pos.side === 'long') return Math.max(0, (entry * qty - margin) / (qty * (1 - MMR)));
  return (entry * qty + margin) / (qty * (1 + MMR));
}
export const upnl = (pos, price) => (price - pos.entry) * pos.qty * (pos.side === 'long' ? 1 : -1);

const freshAccount = () => ({ balance: START_BALANCE, positions: {}, orders: [], history: [], nextId: 1, equityHist: [] });
// k = offset factor: exchange price = real price × k  (k = 1 means exactly the real price)
const defaultCtrl = (price) => ({ mode: 'live', speed: 3, vol: 0, target: price, paused: false, k: 1, funding: 0.01 });

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch {
    return null;
  }
}

// =====================================================================
class Exchange {
  constructor() {
    const s = loadState();
    this.acc = s?.acc ?? freshAccount();
    this.acc.equityHist ??= [];
    // migrate history saved by the older Vietnamese UI
    const LEGACY = {
      'Mở': 'Open', 'Đóng': 'Close', 'Thanh lý': 'Liquidation', 'Đóng thủ công': 'Manual close',
      'Đảo vị thế': 'Flip position', 'Chốt lời (TP)': 'Take profit (TP)', 'Cắt lỗ (SL)': 'Stop loss (SL)',
    };
    for (const h of this.acc.history) {
      h.action = LEGACY[h.action] ?? h.action;
      h.reason = LEGACY[h.reason] ?? h.reason;
    }
    this.alerts = s?.alerts ?? [];
    this.sound = s?.sound ?? true;
    this.nextFunding = nextFundingTime();
    this.lastSnap = 0;
    this.mk = {};
    this.ctrl = {};
    this.real = {}; // latest real price
    for (const sym of SYMBOLS) {
      const p = s?.prices?.[sym] ?? MARKETS[sym].price;
      this.mk[sym] = buildMarket(sym, p);
      const c = { ...defaultCtrl(p), ...(s?.ctrl?.[sym] || {}) };
      if (!['live', 'up', 'down', 'target', 'revert'].includes(c.mode)) c.mode = 'live';
      if (!(c.k > 0)) c.k = 1;
      this.ctrl[sym] = c;
      this.real[sym] = p / c.k;
    }
    this.feed = 'connecting'; // connecting | live | offline
    this.lastMsg = 0;
    this.gotLive = new Set(); // symbols that already received a live trade
    this.clockOffset = 0; // exchange time - local time (ms)
    this.clockSynced = false;
    this.version = 0;
    this.listeners = new Set();
    this.toasts = [];
    this.toastId = 0;
    this.tradeId = 0;
    this.alive = true;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.saveTimer = setInterval(() => this.save(), 3000);
    this.onUnload = () => this.save();
    window.addEventListener('beforeunload', this.onUnload);
    this.loadAllHistory();
    this.connectWS(0);
  }

  destroy() {
    this.alive = false;
    clearInterval(this.timer);
    clearInterval(this.saveTimer);
    window.removeEventListener('beforeunload', this.onUnload);
    try { this.ws?.close(); } catch { /* ignore */ }
    this.save();
  }

  // ================= REAL PRICE DATA =================
  async loadAllHistory() {
    await Promise.all(SYMBOLS.map((s) => this.loadHistory(s).catch(() => null)));
  }

  async loadHistory(sym) {
    const recent = await fetchJson(`/klines?symbol=${sym}&interval=1m&limit=1000`);
    const older = await fetchJson(`/klines?symbol=${sym}&interval=1m&limit=1000&endTime=${recent[0][0] - 1}`).catch(() => []);
    const sec = await fetchJson(`/klines?symbol=${sym}&interval=1s&limit=1000`).catch(() => null);
    const m = this.mk[sym];
    const c = this.ctrl[sym];
    m.c1m = toCandles(older.concat(recent));
    if (sec?.length) {
      m.c1s = toCandles(sec);
    } else {
      const last = m.c1m[m.c1m.length - 1];
      m.c1s = genBack(last.close, Math.floor(Date.now() / 1000) - 1, 600, 1, 0.00015, MARKETS[sym].dp, MARKETS[sym].vol);
    }
    // if the WebSocket has no price yet, use the latest close
    if (!this.gotLive.has(sym)) this.real[sym] = m.c1s[m.c1s.length - 1].close;
    // align our clock with the exchange using the last candle (until the WebSocket syncs it)
    if (!this.clockSynced) {
      const lastT = m.c1s[m.c1s.length - 1].time * 1000;
      if (lastT > Date.now() + this.clockOffset) this.clockOffset = lastT - Date.now();
    }
    const np = roundTo(this.real[sym] * c.k, MARKETS[sym].dp);
    m.price = np;
    m.book = genBook(np, MARKETS[sym]);
    m.realHistory = true;
    m.dataVer++;
    this.emit();
  }

  connectWS(i) {
    if (!this.alive) return;
    const streams = SYMBOLS.map((s) => s.toLowerCase() + '@aggTrade').join('/');
    let opened = false;
    let ws;
    try {
      ws = new WebSocket(`${WS_URLS[i % WS_URLS.length]}?streams=${streams}`);
    } catch {
      setTimeout(() => this.connectWS(i + 1), 3000);
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      opened = true;
    };
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data).data;
      if (d && d.s && this.real[d.s] !== undefined) {
        this.real[d.s] = +d.p;
        this.gotLive.add(d.s);
        this.lastMsg = Date.now();
        // keep our clock in sync with the exchange (local clocks can drift)
        if (d.E) {
          const off = d.E - Date.now();
          this.clockOffset = this.clockSynced ? this.clockOffset * 0.95 + off * 0.05 : off;
          this.clockSynced = true;
        }
        if (this.feed !== 'live') {
          this.feed = 'live';
          this.toast('🌐 Connected to real-time prices', 'ok');
        }
      }
    };
    ws.onclose = () => {
      if (!this.alive) return;
      if (this.feed === 'live') this.toast('Lost real-time feed, reconnecting…', 'err');
      this.feed = 'offline';
      setTimeout(() => this.connectWS(opened ? i : i + 1), 3000);
    };
    ws.onerror = () => ws.close();
  }

  // ----- pub/sub cho React -----
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  emit() {
    this.version++;
    for (const f of this.listeners) f();
  }

  save() {
    try {
      const prices = {};
      for (const s of SYMBOLS) prices[s] = this.mk[s].price;
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ acc: this.acc, prices, ctrl: this.ctrl, alerts: this.alerts, sound: this.sound }),
      );
    } catch { /* ignore */ }
  }

  toast(msg, kind = 'info', sound = false) {
    this.toasts.push({ id: ++this.toastId, msg, kind, time: Date.now() });
    if (sound) this.beep(kind);
    if (this.toasts.length > 6) this.toasts.shift();
  }

  // ================= PRICE SIMULATION =================
  /** Current time in ms, corrected to the exchange clock */
  now() {
    return Date.now() + this.clockOffset;
  }

  tick() {
    const sec = Math.floor(this.now() / 1000);
    for (const sym of SYMBOLS) {
      const c = this.ctrl[sym];
      const m = this.mk[sym];
      const cfg = MARKETS[sym];
      // no real feed -> simulate so the exchange keeps running
      if (this.feed !== 'live') this.real[sym] *= 1 + 0.0001 * randn();
      const real = this.real[sym];

      if (c.paused) {
        c.k = m.price / real; // keep exchange price frozen
      } else {
        const step = c.speed / 100 / TICKS_PER_MIN;
        if (c.mode === 'up') c.k *= 1 + step;
        else if (c.mode === 'down') c.k *= 1 - step;
        else if (c.mode === 'target') c.k = moveToward(c.k, c.target / real, c.k * step);
        else if (c.mode === 'revert') {
          c.k = moveToward(c.k, 1, Math.max(c.k * step, 0.0002));
          if (c.k === 1) {
            c.mode = 'live';
            this.toast(`${sym} is back to the real price`, 'ok');
          }
        }
        if (c.mode !== 'live' && c.vol > 0) c.k *= 1 + 0.00012 * c.vol * randn();
        const np = Math.max(10 ** -cfg.dp, roundTo(real * c.k, cfg.dp));
        this.setPrice(sym, np, sec);
      }
      this.process(sym);
    }
    const now = Date.now();
    this.toasts = this.toasts.filter((t) => now - t.time < 4500);
    if (now >= this.nextFunding) this.applyFunding();
    // record equity every 10 seconds (equity curve)
    if (now - this.lastSnap >= 10000) {
      this.lastSnap = now;
      const h = this.acc.equityHist;
      const t = Math.floor(now / 1000);
      if (!h.length || h[h.length - 1].t !== t) h.push({ t, v: this.equity().equity });
      if (h.length > 5000) h.splice(0, h.length - 5000);
    }
    this.emit();
  }

  setPrice(sym, np, sec) {
    const m = this.mk[sym];
    const cfg = MARKETS[sym];
    const prev = m.price;
    if (np !== prev) m.dir = np > prev ? 1 : -1;
    m.price = np;
    const vol = cfg.vol * (TICK_MS / 1000) * (0.3 + Math.random() * 1.4) * (1 + (Math.abs(np - prev) / prev) * 2000);
    pushCandle(m.c1s, sec, np, vol, MAX_1S);
    pushCandle(m.c1m, Math.floor(sec / 60) * 60, np, vol, MAX_1M);
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      m.trades.unshift({
        id: ++this.tradeId,
        price: np,
        qty: (vol / n / np) * (0.2 + Math.random()),
        side: m.dir > 0 ? 'buy' : 'sell',
        time: Date.now(),
      });
    }
    if (m.trades.length > 40) m.trades.length = 40;
    m.book = genBook(np, cfg);
  }

  /** Price control: mode, speed, volatility, target, pause */
  setCtrl(sym, patch) {
    Object.assign(this.ctrl[sym], patch);
    this.save();
    this.emit();
  }

  /** Instant price shock (pump/dump) in % */
  shock(sym, pct) {
    const c = this.ctrl[sym];
    c.k *= 1 + pct / 100;
    if (c.mode === 'revert') c.mode = 'live';
    this.applyNow(sym);
  }

  /** Instantly reset to the real price */
  resetToReal(sym) {
    Object.assign(this.ctrl[sym], { k: 1, mode: 'live', paused: false });
    this.applyNow(sym);
    this.toast(`🔄 ${sym} reset to real price ${this.mk[sym].price}`, 'ok');
    this.save();
  }

  /** Gradually return to the real price (at trend speed) */
  revertToReal(sym) {
    Object.assign(this.ctrl[sym], { mode: 'revert', paused: false });
    this.save();
    this.emit();
  }

  /** Reset all pairs to the real price */
  resetAllToReal() {
    for (const s of SYMBOLS) {
      Object.assign(this.ctrl[s], { k: 1, mode: 'live', paused: false });
      this.applyNow(s);
    }
    this.toast('🔄 All pairs reset to real price', 'ok');
    this.save();
  }

  applyNow(sym) {
    const cfg = MARKETS[sym];
    const np = Math.max(10 ** -cfg.dp, roundTo(this.real[sym] * this.ctrl[sym].k, cfg.dp));
    this.setPrice(sym, np, Math.floor(this.now() / 1000));
    this.process(sym);
    this.emit();
  }

  stats24(sym) {
    const arr = this.mk[sym].c1m;
    const from = Math.max(0, arr.length - 1440);
    let high = -Infinity, low = Infinity, volume = 0;
    for (let i = from; i < arr.length; i++) {
      const c = arr[i];
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      volume += c.volume;
    }
    const open = arr[from].open;
    const price = this.mk[sym].price;
    return { open, high, low, volume, change: ((price - open) / open) * 100 };
  }

  // ================= ACCOUNT =================
  equity() {
    const a = this.acc;
    let eq = a.balance;
    let pnl = 0;
    for (const p of Object.values(a.positions)) {
      const u = upnl(p, this.mk[p.sym].price);
      pnl += u;
      eq += Math.max(0, p.margin + u);
    }
    for (const o of a.orders) eq += o.locked;
    return { equity: eq, upnl: pnl };
  }

  addHistory(h) {
    this.acc.history.unshift({ id: this.acc.nextId++, time: this.now(), ...h });
    if (this.acc.history.length > 500) this.acc.history.length = 500;
  }

  /** Apply a fill to a position (open / add / reduce / flip) */
  execute(sym, side, qty, price, feeRate, lev, tp = null, sl = null, reason = 'Market') {
    const a = this.acc;
    const pos = a.positions[sym];
    const notional = qty * price;

    if (!pos || pos.side === side) {
      const margin = notional / lev;
      const fee = notional * feeRate;
      if (margin + fee > a.balance + 1e-9) throw new Error('Insufficient available balance');
      a.balance -= margin + fee;
      if (!pos) {
        a.positions[sym] = { sym, side, qty, entry: price, margin, leverage: lev, tp, sl, openedAt: Date.now() };
      } else {
        const nq = pos.qty + qty;
        pos.entry = (pos.entry * pos.qty + price * qty) / nq;
        pos.qty = nq;
        pos.margin += margin;
        pos.leverage = (pos.entry * pos.qty) / pos.margin;
        if (tp != null) pos.tp = tp;
        if (sl != null) pos.sl = sl;
      }
      this.addHistory({ sym, side, action: 'Open', reason, qty, price, fee, pnl: null });
      return;
    }

    // opposite side: reduce / close / flip position
    const closeQty = Math.min(qty, pos.qty);
    const dir = pos.side === 'long' ? 1 : -1;
    const pnl = (price - pos.entry) * closeQty * dir;
    const fee = closeQty * price * feeRate;
    const release = (pos.margin * closeQty) / pos.qty;
    const credit = Math.max(0, release + pnl) - fee;
    const rem = qty - closeQty;
    if (rem > 1e-12) {
      const need = rem * price * (1 / lev + feeRate);
      if (a.balance + credit + 1e-9 < need) throw new Error('Insufficient balance to flip position');
    }
    a.balance += credit;
    pos.qty -= closeQty;
    pos.margin -= release;
    this.addHistory({ sym, side: pos.side, action: 'Close', reason, qty: closeQty, price, fee, pnl });
    if (pos.qty <= 1e-12) delete a.positions[sym];
    if (rem > 1e-12) this.execute(sym, side, rem, price, feeRate, lev, tp, sl, reason);
  }

  /** Max quantity for a reduce-only order (may only reduce an opposite position) */
  reduceQty(sym, side, qty) {
    const pos = this.acc.positions[sym];
    if (!pos || pos.side === side) return 0;
    return Math.min(qty, pos.qty);
  }

  /**
   * type: 'market' | 'limit' | 'stop' (Stop Market: triggers when price reaches `stop`)
   */
  placeOrder({ sym, side, type, size, price, stop, lev, tp, sl, reduceOnly = false }) {
    try {
      const m = this.mk[sym];
      const cfg = MARKETS[sym];
      const long = side === 'long';
      if (!(size > 0)) throw new Error('Please enter an amount');
      if (type === 'limit' && !(price > 0)) throw new Error('Please enter a limit price');
      if (type === 'stop' && !(stop > 0)) throw new Error('Please enter a trigger price');
      if (type === 'stop' && Math.abs(stop - m.price) < 10 ** -cfg.dp) throw new Error('Trigger price must differ from the current price');
      if (reduceOnly) { tp = null; sl = null; }
      const ref = type === 'limit' ? price : type === 'stop' ? stop : m.price;
      if (tp != null && (long ? tp <= ref : tp >= ref)) throw new Error('Invalid take-profit price');
      if (sl != null && (long ? sl >= ref : sl <= ref)) throw new Error('Invalid stop-loss price');

      const marketable = type === 'market' || (type === 'limit' && (long ? price >= m.price : price <= m.price));
      if (marketable) {
        const px = m.price;
        let qty = size / px;
        if (reduceOnly) {
          qty = this.reduceQty(sym, side, qty);
          if (!qty) throw new Error('Reduce-only: no opposite position to reduce');
        }
        this.execute(sym, side, qty, px, FEE_TAKER, lev, tp, sl, type === 'market' ? 'Market' : 'Limit');
        this.toast(`Filled ${long ? 'LONG' : 'SHORT'} ${qty.toFixed(cfg.qdp)} ${cfg.base} @ ${px.toFixed(cfg.dp)}`, 'ok', true);
      } else {
        const px = type === 'limit' ? price : stop;
        const qty = size / px;
        if (reduceOnly && !this.reduceQty(sym, side, qty)) throw new Error('Reduce-only: no opposite position to reduce');
        const pos = this.acc.positions[sym];
        const offset = pos && pos.side !== side ? Math.min(pos.qty, qty) : 0;
        const feeRate = type === 'limit' ? FEE_MAKER : FEE_TAKER;
        const locked = reduceOnly ? size * feeRate : ((qty - offset) * px) / lev + size * feeRate;
        if (locked > this.acc.balance + 1e-9) throw new Error('Insufficient available balance');
        this.acc.balance -= locked;
        this.acc.orders.push({
          id: this.acc.nextId++, sym, side, type, price: px,
          trigger: type === 'stop' ? (stop > m.price ? 'up' : 'down') : null,
          qty, lev, tp, sl, reduceOnly, locked, time: Date.now(),
        });
        this.toast(`Placed ${type === 'limit' ? 'Limit' : 'Stop Market'} ${side.toUpperCase()} @ ${px.toFixed(cfg.dp)}`, 'info');
      }
      this.save();
      this.emit();
      return true;
    } catch (e) {
      this.toast(e.message, 'err');
      this.emit();
      return false;
    }
  }

  cancelOrder(id, silent = false) {
    const o = this.acc.orders.find((x) => x.id === id);
    if (!o) return;
    this.acc.orders = this.acc.orders.filter((x) => x !== o);
    this.acc.balance += o.locked;
    if (!silent) this.toast('Order cancelled', 'info');
    this.save();
    this.emit();
  }

  cancelAllOrders() {
    for (const o of [...this.acc.orders]) this.cancelOrder(o.id, true);
    this.toast('All open orders cancelled', 'info');
  }

  closePosition(sym, fraction = 1, reason = 'Manual close') {
    const pos = this.acc.positions[sym];
    if (!pos) return;
    const opp = pos.side === 'long' ? 'short' : 'long';
    const price = this.mk[sym].price;
    this.execute(sym, opp, pos.qty * fraction, price, FEE_TAKER, pos.leverage, null, null, reason);
    const h = this.acc.history[0];
    this.toast(`${reason}: ${sym} PnL ${h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)} USDT`, h.pnl >= 0 ? 'ok' : 'err', true);
    this.save();
    this.emit();
  }

  closeAll() {
    for (const s of Object.keys(this.acc.positions)) this.closePosition(s);
  }

  /** Flip position (Long -> Short with the same size, and vice versa) */
  reversePosition(sym) {
    const pos = this.acc.positions[sym];
    if (!pos) return;
    const opp = pos.side === 'long' ? 'short' : 'long';
    try {
      this.execute(sym, opp, pos.qty * 2, this.mk[sym].price, FEE_TAKER, pos.leverage, null, null, 'Flip position');
      this.toast(`🔁 Flipped ${sym} to ${opp.toUpperCase()}`, 'ok', true);
    } catch (e) {
      this.toast(e.message, 'err');
    }
    this.save();
    this.emit();
  }

  /** Add (amount > 0) or remove (amount < 0) margin of an isolated position */
  adjustMargin(sym, amount) {
    const pos = this.acc.positions[sym];
    if (!pos || !amount) return;
    const a = this.acc;
    if (amount > 0) {
      if (amount > a.balance + 1e-9) return this.toast('Insufficient available balance', 'err');
      a.balance -= amount;
      pos.margin += amount;
    } else {
      const nm = pos.margin + amount;
      if (nm < (pos.qty * pos.entry) / 125) return this.toast('Cannot remove: exceeds max leverage 125x', 'err');
      const l = liqPrice({ ...pos, margin: nm });
      const price = this.mk[sym].price;
      if (pos.side === 'long' ? l >= price * 0.995 : l <= price * 1.005)
        return this.toast('Cannot remove: position would be too close to liquidation', 'err');
      pos.margin = nm;
      a.balance -= amount;
    }
    pos.leverage = (pos.entry * pos.qty) / pos.margin;
    this.toast(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount).toFixed(2)} USDT margin ${amount > 0 ? 'to' : 'from'} ${sym}`, 'ok');
    this.save();
    this.emit();
  }

  setTpSl(sym, tp, sl) {
    const pos = this.acc.positions[sym];
    if (!pos) return;
    const price = this.mk[sym].price;
    const long = pos.side === 'long';
    if (tp != null && (long ? tp <= price : tp >= price)) return this.toast('Invalid take-profit price', 'err');
    if (sl != null && (long ? sl >= price : sl <= price)) return this.toast('Invalid stop-loss price', 'err');
    pos.tp = tp;
    pos.sl = sl;
    this.toast('TP/SL updated', 'ok');
    this.save();
    this.emit();
  }

  faucet() {
    this.acc.balance += 10000;
    this.toast('+10,000 USDT demo', 'ok');
    this.save();
    this.emit();
  }

  resetAccount() {
    this.acc = freshAccount();
    this.toast('Account reset', 'info');
    this.save();
    this.emit();
  }

  // ================= FUNDING =================
  applyFunding() {
    const a = this.acc;
    let total = 0;
    for (const pos of Object.values(a.positions)) {
      const rate = (this.ctrl[pos.sym].funding || 0) / 100;
      const price = this.mk[pos.sym].price;
      const pay = pos.qty * price * rate * (pos.side === 'long' ? 1 : -1); // > 0: position pays
      pos.margin -= pay;
      pos.leverage = (pos.entry * pos.qty) / Math.max(pos.margin, 1e-9);
      total -= pay;
      this.addHistory({ sym: pos.sym, side: pos.side, action: 'Funding', reason: `${(rate * 100).toFixed(4)}%`, qty: pos.qty, price, fee: 0, pnl: -pay });
    }
    this.nextFunding = nextFundingTime();
    if (Object.keys(a.positions).length) {
      this.toast(`💸 Funding: ${total >= 0 ? '+' : ''}${total.toFixed(4)} USDT`, total >= 0 ? 'ok' : 'err', true);
    } else {
      this.toast('💸 Funding settled (no open positions)', 'info');
    }
    for (const s of SYMBOLS) this.process(s);
    this.save();
    this.emit();
  }

  // ================= PRICE ALERTS =================
  addAlert(sym, price, note = '') {
    if (!(price > 0)) return this.toast('Invalid alert price', 'err');
    const cur = this.mk[sym].price;
    this.alerts.push({ id: Date.now() + Math.random(), sym, price, note, dir: price >= cur ? 'up' : 'down', time: Date.now() });
    this.toast(`🔔 Alert created: ${sym} ${price >= cur ? '≥' : '≤'} ${price}`, 'info');
    this.save();
    this.emit();
  }

  removeAlert(id) {
    this.alerts = this.alerts.filter((a) => a.id !== id);
    this.save();
    this.emit();
  }

  // ================= ADVANCED CONTROL TOOLS =================
  /** Create a wick: spike price by pct% then return after ~0.7s */
  wick(sym, pct) {
    const c = this.ctrl[sym];
    const f = 1 + pct / 100;
    c.k *= f;
    this.applyNow(sym);
    setTimeout(() => {
      c.k /= f;
      this.applyNow(sym);
    }, 700);
  }

  /** Move price to the liquidation / SL / TP level of the open position */
  hunt(sym, what) {
    const pos = this.acc.positions[sym];
    if (!pos) return this.toast(`No ${sym} position to hunt`, 'err');
    const long = pos.side === 'long';
    let target;
    if (what === 'liq') target = liqPrice(pos) * (long ? 0.998 : 1.002);
    else if (what === 'sl') {
      if (pos.sl == null) return this.toast('Position has no SL set', 'err');
      target = pos.sl * (long ? 0.999 : 1.001);
    } else {
      if (pos.tp == null) return this.toast('Position has no TP set', 'err');
      target = pos.tp * (long ? 1.001 : 0.999);
    }
    this.setCtrl(sym, { mode: 'target', target: roundTo(target, MARKETS[sym].dp), paused: false });
    this.toast(`🎯 Moving ${sym} price to ${target.toFixed(MARKETS[sym].dp)}`, 'info');
  }

  setSound(on) {
    this.sound = on;
    this.save();
    this.emit();
  }

  beep(kind) {
    if (!this.sound) return;
    try {
      const ctx = (this.audio ??= new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = kind === 'err' ? 220 : kind === 'alert' ? 990 : 660;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.26);
    } catch { /* browser blocked audio */ }
  }

  /** Check open orders, alerts, TP/SL and liquidation after every price move */
  process(sym) {
    const a = this.acc;
    const price = this.mk[sym].price;
    const cfg = MARKETS[sym];

    // price alerts
    for (const al of this.alerts.filter((x) => x.sym === sym)) {
      if (al.dir === 'up' ? price >= al.price : price <= al.price) {
        this.alerts = this.alerts.filter((x) => x !== al);
        this.toast(`🔔 ${sym} ${al.dir === 'up' ? 'rose above' : 'fell below'} ${al.price}${al.note ? ' – ' + al.note : ''}`, 'alert', true);
      }
    }

    // Limit / Stop Market orders
    for (const o of a.orders.filter((x) => x.sym === sym)) {
      const type = o.type || 'limit';
      const hit =
        type === 'limit'
          ? o.side === 'long' ? price <= o.price : price >= o.price
          : o.trigger === 'up' ? price >= o.price : price <= o.price;
      if (!hit) continue;
      a.orders = a.orders.filter((x) => x !== o);
      a.balance += o.locked;
      const px = type === 'limit' ? o.price : price;
      let qty = o.qty;
      if (o.reduceOnly) {
        qty = this.reduceQty(sym, o.side, qty);
        if (!qty) {
          this.toast('Reduce-only order cancelled: no position left', 'err');
          continue;
        }
      }
      const label = type === 'limit' ? 'Limit' : 'Stop Market';
      try {
        this.execute(sym, o.side, qty, px, type === 'limit' ? FEE_MAKER : FEE_TAKER, o.lev, o.tp, o.sl, label);
        this.toast(`${label} ${o.side.toUpperCase()} ${sym} filled @ ${px.toFixed(cfg.dp)}`, 'ok', true);
      } catch (e) {
        this.toast(`${label} order cancelled: ${e.message}`, 'err');
      }
    }

    const pos = a.positions[sym];
    if (!pos) return;
    const long = pos.side === 'long';
    const liq = liqPrice(pos);
    if (long ? price <= liq : price >= liq) {
      this.addHistory({ sym, side: pos.side, action: 'Liquidation', reason: 'Liquidation', qty: pos.qty, price, fee: 0, pnl: -Math.max(pos.margin, 0) });
      delete a.positions[sym];
      // cancel remaining reduce-only orders for this pair
      for (const o of a.orders.filter((x) => x.sym === sym && x.reduceOnly)) this.cancelOrder(o.id, true);
      this.toast(`💥 ${pos.side.toUpperCase()} ${sym} position LIQUIDATED (-${Math.max(pos.margin, 0).toFixed(2)} USDT)`, 'err', true);
      this.save();
      return;
    }
    if (pos.tp != null && (long ? price >= pos.tp : price <= pos.tp)) this.closePosition(sym, 1, 'Take profit (TP)');
    else if (pos.sl != null && (long ? price <= pos.sl : price >= pos.sl)) this.closePosition(sym, 1, 'Stop loss (SL)');
  }
}

export const ex = new Exchange();

if (import.meta.hot) import.meta.hot.dispose(() => ex.destroy());
