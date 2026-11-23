import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ex, MARKETS } from '../engine/exchange';
import { coinIcon, timeAgo } from '../lib/api';
import { fmt, fmtPct, cls } from '../utils';

/** Coin logo with a lettered fallback */
export function CoinIcon({ base, size = 22 }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span className="coin-fallback" style={{ width: size, height: size, fontSize: size * 0.45 }}>
        {base.slice(0, 1)}
      </span>
    );
  }
  return <img className="coin-icon" src={coinIcon(base)} width={size} height={size} alt={base} onError={() => setErr(true)} loading="lazy" />;
}

/** 24h sparkline from the 1m candles of a symbol */
export function Sparkline({ sym, width = 120, height = 36, points = 48 }) {
  const arr = ex.mk[sym].c1m;
  const from = Math.max(0, arr.length - 1440);
  const step = Math.max(1, Math.floor((arr.length - from) / points));
  const vals = [];
  for (let i = from; i < arr.length; i += step) vals.push(arr[i].close);
  vals.push(ex.mk[sym].price);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const d = vals
    .map((v, i) => `${((i / (vals.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`)
    .join(' ');
  const up = vals[vals.length - 1] >= vals[0];
  const color = up ? 'var(--green)' : 'var(--red)';
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={`0,${height} ${d} ${width},${height}`} fill={up ? 'rgba(22,199,132,.10)' : 'rgba(234,57,67,.10)'} stroke="none" />
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** One row of a compact coin list */
export function CoinRow({ sym, right = 'change' }) {
  const cfg = MARKETS[sym];
  const st = ex.stats24(sym);
  return (
    <Link className="coin-row" to={`/trade/${sym}`}>
      <CoinIcon base={cfg.base} />
      <span className="coin-name">
        <b>{cfg.base}</b>
        <span className="muted">/USDT</span>
      </span>
      <span className="coin-price">{fmt(ex.mk[sym].price, cfg.dp)}</span>
      {right === 'volume' ? (
        <span className="coin-right muted">${fmtShort(st.volume)}</span>
      ) : (
        <span className={`coin-right pill ${cls(st.change)}`}>{fmtPct(st.change)}</span>
      )}
    </Link>
  );
}

export const fmtShort = (n) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n);

/** Fear & Greed semicircle gauge */
export function FearGreedGauge({ value, label, size = 180 }) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const angle = Math.PI * (1 - value / 100);
  const nx = cx + Math.cos(angle) * (r - 14);
  const ny = cy - Math.sin(angle) * (r - 14);
  const arc = (a0, a1) => {
    const p0 = [cx + Math.cos(a0) * r, cy - Math.sin(a0) * r];
    const p1 = [cx + Math.cos(a1) * r, cy - Math.sin(a1) * r];
    return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
  };
  const segs = ['#ea3943', '#f0846b', '#f0b90b', '#93d16a', '#16c784'];
  const color = value < 25 ? segs[0] : value < 45 ? segs[1] : value < 56 ? segs[2] : value < 75 ? segs[3] : segs[4];
  return (
    <svg width={size} height={size / 2 + 34} viewBox={`0 0 ${size} ${size / 2 + 34}`} role="img" aria-label={`Fear and Greed ${value}`}>
      {segs.map((c, i) => (
        <path key={c} d={arc(Math.PI - (i * Math.PI) / 5 - 0.02, Math.PI - ((i + 1) * Math.PI) / 5 + 0.02)} stroke={c} strokeWidth="10" fill="none" strokeLinecap="round" opacity=".9" />
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="var(--text)" />
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{value}</text>
      <text x={cx} y={cy - r / 2} textAnchor="middle" fontSize="11" fill="var(--muted)">{label}</text>
    </svg>
  );
}

/** News card used on Home and News pages */
export function NewsCard({ item, variant = 'card' }) {
  const [imgOk, setImgOk] = useState(Boolean(item.image));
  return (
    <a className={`news-${variant}`} href={item.link} target="_blank" rel="noopener noreferrer">
      {variant !== 'line' && (
        <div className="news-img">
          {imgOk ? (
            <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} />
          ) : (
            <div className="news-img-fallback">{item.source}</div>
          )}
        </div>
      )}
      <div className="news-body">
        <div className="news-meta">
          <span className="news-source">{item.source}</span>
          <span className="muted">· {timeAgo(item.time)}</span>
          {item.topics.slice(0, 2).map((t) => (
            <span key={t} className="news-tag">{t}</span>
          ))}
        </div>
        <h3>{item.title}</h3>
        {variant !== 'line' && item.summary && <p>{item.summary}</p>}
      </div>
    </a>
  );
}

export function Section({ title, link, linkText = 'View all →', children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      <div className="section-head">
        <h2>{title}</h2>
        {link && <Link to={link} className="section-link">{linkText}</Link>}
      </div>
      {children}
    </section>
  );
}
