import { useEffect, useRef, useState } from 'react';
import Frog from './Frog';
import { STORY, TOKENOMICS, TOKEN_FACTS, ROADMAP, FAQ } from './content';

// ---------------------------------------------------------------- story
const SCENES = {
  night: 'linear-gradient(180deg,#0b1d3a,#123d2a)',
  moon: 'radial-gradient(circle at 80% 20%,#fff7c2 0 8%,transparent 9%),linear-gradient(180deg,#1a1050,#0d3b2e)',
  red: 'linear-gradient(180deg,#4a0b12,#1b0a0a)',
  dawn: 'linear-gradient(180deg,#ff9a76,#ffd84d 60%,#5fd068)',
  lab: 'repeating-linear-gradient(90deg,rgba(124,252,0,.08) 0 1px,transparent 1px 22px),repeating-linear-gradient(0deg,rgba(124,252,0,.08) 0 1px,transparent 1px 22px),#0c1a12',
  space: 'radial-gradient(circle at 70% 30%,#ffe9a8 0 10%,transparent 11%),radial-gradient(circle,#fff 1px,transparent 1.5px) 0 0/40px 40px,#0b0630',
};

export function StoryComic({ compact = false }) {
  return (
    <div className={`comic ${compact ? 'compact' : ''}`}>
      {STORY.map((c) => (
        <div key={c.n} className="panel-comic" style={{ '--tilt': `${(c.n % 2 ? -1 : 1) * 0.6}deg` }}>
          <div className="panel-art" style={{ background: SCENES[c.scene] }}>
            <span className="panel-num">CH. {c.n}</span>
            <div className="speech">{c.bubble}</div>
            <Frog mood={c.mood} size={compact ? 90 : 130} />
            {c.scene === 'red' && <span className="panel-fx">-125x 💥</span>}
            {c.scene === 'space' && <span className="panel-fx moon">🌕</span>}
          </div>
          <h3>{c.title}</h3>
          <p>{c.text}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- tokenomics
export function Tokenomics() {
  const [hover, setHover] = useState(null);
  const r = 70;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const active = hover != null ? TOKENOMICS[hover] : null;
  return (
    <div className="tokenomics">
      <div className="donut-wrap">
        <svg viewBox="0 0 200 200" className="donut">
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="34" />
          {TOKENOMICS.map((t, i) => {
            const len = (t.pct / 100) * C;
            const el = (
              <circle
                key={t.label}
                cx="100" cy="100" r={r} fill="none" stroke={t.color} strokeWidth={hover === i ? 40 : 32}
                strokeDasharray={`${len - 2} ${C - len + 2}`} strokeDashoffset={-acc}
                transform="rotate(-90 100 100)" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width .15s', cursor: 'pointer' }}
              />
            );
            acc += len;
            return el;
          })}
          <text x="100" y="94" textAnchor="middle" className="donut-big">{active ? `${active.pct}%` : '🐸'}</text>
          <text x="100" y="116" textAnchor="middle" className="donut-small">{active ? active.label : '420.69T'}</text>
        </svg>
      </div>
      <div className="token-side">
        <div className="token-facts">
          {TOKEN_FACTS.map(([k, v]) => (
            <div key={k}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
        {TOKENOMICS.map((t, i) => (
          <div key={t.label} className={`alloc ${hover === i ? 'on' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <i style={{ background: t.color }} />
            <b>{t.label}</b>
            <span className="alloc-pct">{t.pct}%</span>
            <small>{t.note}</small>
          </div>
        ))}
        <p className="concept-note">⚠ Proposed allocation for a concept. No $WPEPE token has been created or sold.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- roadmap
export function Roadmap() {
  return (
    <div className="roadmap">
      {ROADMAP.map((p) => (
        <div key={p.phase} className={`road-card ${p.status}`}>
          <div className="road-icon">{p.icon}</div>
          <div className="road-phase">{p.phase}</div>
          <h3>{p.name}</h3>
          <span className={`road-status ${p.status}`}>{p.status === 'done' ? '✔ Done' : p.status === 'next' ? '⏳ Next' : '🔭 Later'}</span>
          <ul>
            {p.items.map(([t, done]) => (
              <li key={t} className={done ? 'done' : ''}>{done ? '✅' : '⬜'} {t}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- FAQ
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {FAQ.map(([q, a], i) => (
        <div key={q} className={`faq-item ${open === i ? 'open' : ''}`}>
          <button onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{q}</span>
            <b>{open === i ? '−' : '+'}</b>
          </button>
          {open === i && <p>{a}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- ribbit clicker
const RANKS = [
  [0, 'Egg'], [10, 'Tadpole'], [50, 'Froglet'], [150, 'Lily Pad Holder'], [420, 'Swamp Lord'], [1000, 'Moon Frog'], [6969, 'Legendary W'],
];
let audioCtx = null;
export function croak() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180 + Math.random() * 60, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.24);
  } catch { /* audio blocked */ }
}

export function RibbitClicker({ size = 160 }) {
  const [count, setCount] = useState(() => {
    try {
      return +localStorage.getItem('wpepe.ribbits') || 0;
    } catch {
      return 0;
    }
  });
  const [pops, setPops] = useState([]);
  const [squish, setSquish] = useState(false);
  const id = useRef(0);
  const rank = [...RANKS].reverse().find(([n]) => count >= n)[1];
  const next = RANKS.find(([n]) => n > count);

  useEffect(() => {
    try {
      localStorage.setItem('wpepe.ribbits', String(count));
    } catch { /* ignore */ }
  }, [count]);

  const click = (e) => {
    croak();
    setCount((c) => c + 1);
    setSquish(true);
    setTimeout(() => setSquish(false), 120);
    const rect = e.currentTarget.getBoundingClientRect();
    const p = { id: ++id.current, x: e.clientX - rect.left, y: e.clientY - rect.top, t: Math.random() > 0.8 ? 'WAGMI!' : '+1 RIBBIT' };
    setPops((v) => [...v.slice(-12), p]);
    setTimeout(() => setPops((v) => v.filter((x) => x.id !== p.id)), 900);
  };

  return (
    <div className="ribbit">
      <button className={`ribbit-frog ${squish ? 'squish' : ''}`} onClick={click} aria-label="Ribbit">
        <Frog mood={count >= 1000 ? 'moon' : count >= 420 ? 'diamond' : count >= 150 ? 'wise' : 'happy'} size={size} />
        {pops.map((p) => (
          <span key={p.id} className="pop" style={{ left: p.x, top: p.y }}>{p.t}</span>
        ))}
      </button>
      <div className="ribbit-count">{count.toLocaleString('en-US')} <small>ribbits</small></div>
      <div className="ribbit-rank">Rank: <b>{rank}</b>{next && <span> · {next[0] - count} to {next[1]}</span>}</div>
    </div>
  );
}
