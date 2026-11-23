import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Frog from './Frog';
import MemeMaker from './MemeMaker';
import { StoryComic, Tokenomics, Roadmap, Faq, RibbitClicker, croak } from './sections';
import { MARQUEE, TAGLINES, TICKER } from './content';
import { ex, SYMBOLS, MARKETS } from '../engine/exchange';
import { fmt, fmtPct, cls } from '../utils';
import WalletButton from '../wallet/WalletButton';
import { AirdropBanner, RecentJoinToasts, AirdropWin, AirdropSection } from '../airdrop/fomo';

// ---------------------------------------------------------------- window contents
function HeroWin({ go }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % TAGLINES.length), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hero-win">
      <div className="hero-win-frog"><Frog mood="moon" size={150} /></div>
      <div>
        <div className="sticker-tag">{TICKER} · concept</div>
        <h1 className="meme-title">WPEPE</h1>
        <p className="tagline" key={i}>{TAGLINES[i]}</p>
        <div className="hero-win-cta">
          <button className="meme-btn primary" onClick={() => go('/trade/BTCUSDT')}>🚀 Enter the Swamp</button>
          <button className="meme-btn" onClick={() => go('/whitepaper')}>📜 Litepaper</button>
        </div>
      </div>
    </div>
  );
}

function Trash() {
  return (
    <div className="trash-win">
      <p><b>Paper Hands</b> (4 items)</p>
      <ul>
        <li>📄 sold_at_the_bottom.bag</li>
        <li>📄 it_will_come_back.txt</li>
        <li>📄 125x_rent_money.xls</li>
        <li>📄 no_stop_loss_strategy.pdf</li>
      </ul>
      <button className="meme-btn" onClick={croak}>🗑 Empty trash (ribbit)</button>
    </div>
  );
}

function PricesWin() {
  return (
    <div className="prices-win">
      {SYMBOLS.slice(0, 8).map((s) => {
        const ch = ex.stats24(s).change;
        return (
          <Link key={s} to={`/trade/${s}`} className="price-line">
            <b>{MARKETS[s].base}</b>
            <span>{fmt(ex.mk[s].price, MARKETS[s].dp)}</span>
            <span className={cls(ch)}>{fmtPct(ch)}</span>
          </Link>
        );
      })}
      <small>Live market prices · click to trade (demo)</small>
    </div>
  );
}

const APPS = [
  { id: 'wpepe', title: 'WPEPE.exe', icon: '🐸', w: 560 },
  { id: 'airdrop', title: 'airdrop.exe', icon: '🪂', w: 340 },
  { id: 'ribbit', title: 'ribbit.exe', icon: '🔊', w: 290 },
  { id: 'prices', title: 'swamp_prices.live', icon: '📈', w: 300 },
  { id: 'story', title: 'the_legend.txt', icon: '📜', w: 760 },
  { id: 'tokenomics', title: 'tokenomics.xls', icon: '📊', w: 720 },
  { id: 'roadmap', title: 'roadmap.exe', icon: '🗺️', w: 820 },
  { id: 'meme', title: 'meme_maker.app', icon: '🎨', w: 780 },
  { id: 'trash', title: 'Paper Hands', icon: '🗑️', w: 320 },
  { id: 'exchange', title: 'Swamp Exchange', icon: '💹', link: '/trade/BTCUSDT' },
  { id: 'paper', title: 'litepaper.pdf', icon: '📄', link: '/whitepaper' },
  { id: 'news', title: 'News Swamp', icon: '📰', link: '/news' },
  { id: 'academy', title: 'Frog Academy', icon: '🎓', link: '/learn' },
];
const START = {
  wpepe: { x: 215, y: 50 },
  airdrop: { x: 800, y: 70 },
  ribbit: { x: 560, y: 430 },
  prices: { x: 1100, y: 300 },
};

const TIPS = [
  'It looks like you’re about to 125x. Would you like help? 🐸',
  'Pro tip: a stop loss is just a seatbelt for your flies.',
  'Type “ribbit” anywhere on this page. Trust me.',
  'Paper hands go to the trash. Diamond webs go to the moon.',
  'Funding is positive? Longs are paying shorts. Ribbit.',
  'Click me again and I’ll croak. I warned you.',
  'The airdrop allowlist is open. Tadpoles who wait stay tadpoles. 🪂',
  'Invite a fren, earn points. Two frogs croak louder than one.',
];

// ---------------------------------------------------------------- window
function OsWindow({ app, pos, z, active, mobile, onFocus, onClose, onMin, onMove, children }) {
  const drag = useRef(null);
  const down = (e) => {
    if (mobile || e.button !== 0) return;
    onFocus();
    drag.current = { sx: e.clientX, sy: e.clientY, x: pos.x, y: pos.y };
    const move = (ev) => onMove({ x: drag.current.x + ev.clientX - drag.current.sx, y: Math.max(0, drag.current.y + ev.clientY - drag.current.sy) });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div
      className={`os-window ${active ? 'active' : ''}`}
      style={mobile ? undefined : { left: pos.x, top: pos.y, width: app.w, zIndex: z }}
      onPointerDown={onFocus}
    >
      <div className="os-title" onPointerDown={down}>
        <span className="os-title-text">{app.icon} {app.title}</span>
        <span className="os-btns">
          <button onClick={onMin} aria-label="Minimize">_</button>
          <button aria-label="Maximize" onClick={() => onMove({ x: 20, y: 10 })}>□</button>
          <button onClick={onClose} aria-label="Close">×</button>
        </span>
      </div>
      <div className="os-body">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- frog rain easter egg
function useFrogRain() {
  const [drops, setDrops] = useState([]);
  const rain = useCallback(() => {
    croak();
    const items = Array.from({ length: 46 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 1.6,
      dur: 2.2 + Math.random() * 2,
      size: 18 + Math.random() * 34,
      e: ['🐸', '🐸', '🐸', '💚', '🪰', '💎', '🚀'][Math.floor(Math.random() * 7)],
    }));
    setDrops(items);
    setTimeout(() => setDrops([]), 5200);
  }, []);
  useEffect(() => {
    let buf = '';
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      buf = (buf + e.key.toLowerCase()).slice(-6);
      if (buf === 'ribbit') rain();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rain]);
  const layer = drops.length ? (
    <div className="frog-rain" aria-hidden="true">
      {drops.map((d) => (
        <span key={d.id} style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s`, fontSize: d.size }}>{d.e}</span>
      ))}
    </div>
  ) : null;
  return [layer, rain];
}

// ---------------------------------------------------------------- page
export default function Landing() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(['wpepe', 'airdrop', 'ribbit', 'prices']);
  const [order, setOrder] = useState(['prices', 'ribbit', 'wpepe', 'airdrop']);
  const [pos, setPos] = useState(START);
  const [clock, setClock] = useState(new Date());
  const [tip, setTip] = useState(0);
  const [mobile, setMobile] = useState(() => window.innerWidth < 900);
  const [rainLayer, rain] = useFrogRain();

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    const tt = setInterval(() => setTip((v) => (v + 1) % TIPS.length), 7000);
    const onResize = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(t);
      clearInterval(tt);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const focus = (id) => setOrder((o) => [...o.filter((x) => x !== id), id]);
  const launch = (app) => {
    if (app.link) return navigate(app.link);
    if (!open.includes(app.id)) {
      setOpen((o) => [...o, app.id]);
      setPos((p) => (p[app.id] ? p : { ...p, [app.id]: { x: 215 + (Object.keys(p).length % 5) * 40, y: 30 + (Object.keys(p).length % 5) * 30 } }));
    }
    focus(app.id);
    if (mobile) setTimeout(() => document.getElementById(`win-${app.id}`)?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const close = (id) => setOpen((o) => o.filter((x) => x !== id));

  const content = (id) => {
    switch (id) {
      case 'wpepe': return <HeroWin go={navigate} />;
      case 'airdrop': return <AirdropWin />;
      case 'ribbit': return <RibbitClicker size={150} />;
      case 'prices': return <PricesWin />;
      case 'story': return <StoryComic compact />;
      case 'tokenomics': return <Tokenomics />;
      case 'roadmap': return <Roadmap />;
      case 'meme': return <MemeMaker />;
      case 'trash': return <Trash />;
      default: return null;
    }
  };
  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="landing">
      {rainLayer}
      {/* ---------- menu bar ---------- */}
      <div className="menubar">
        <Link to="/" className="mb-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>🐸 WPEPE</Link>
        <span className="mb-menu hide-sm">File</span>
        <span className="mb-menu hide-sm">Swamp</span>
        <span className="mb-menu hide-sm" onClick={rain}>Ribbit</span>
        <a className="mb-menu hide-sm" href="#legend">Lore</a>
        <a className="mb-menu hide-sm" href="#tokenomics">Tokenomics</a>
        <a className="mb-menu hide-sm" href="#roadmap">Roadmap</a>
        <Link className="mb-menu hide-sm" to="/whitepaper">Litepaper</Link>
        <Link className="mb-menu mb-hot" to="/airdrop">🪂 Airdrop</Link>
        <span className="spacer" />
        <button className="mb-menu hide-sm" onClick={fullscreen}>⛶ Fullscreen</button>
        <span className="mb-clock">{clock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        <WalletButton variant="meme" />
        <Link to="/app" className="mb-launch hide-sm">Launch App →</Link>
      </div>
      <AirdropBanner variant="meme" />

      {/* ---------- desktop ---------- */}
      <section className="desktop">
        <div className="sky" aria-hidden="true">
          <div className="stars" />
          <button className="moon" onClick={rain} title="Moon Pond (click me)" tabIndex={-1} />
          <svg className="hills" viewBox="0 0 1440 220" preserveAspectRatio="none">
            <path d="M0 140 C200 60 360 160 560 100 C760 40 900 150 1100 90 C1260 50 1360 110 1440 80 L1440 220 L0 220 Z" fill="#0d2f22" />
            <path d="M0 180 C240 120 420 200 700 150 C980 100 1180 190 1440 140 L1440 220 L0 220 Z" fill="#0a2419" />
          </svg>
          <div className="pond">
            {[8, 22, 47, 68, 86].map((l, i) => (
              <span key={l} className="lily" style={{ left: `${l}%`, animationDelay: `${i * 0.7}s` }} />
            ))}
          </div>
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="firefly" style={{ left: `${(i * 53) % 100}%`, top: `${20 + ((i * 37) % 60)}%`, animationDelay: `${(i % 6) * 0.8}s`, animationDuration: `${5 + (i % 5)}s` }} />
          ))}
          <span className="fly f1">🪰</span>
          <span className="fly f2">🪰</span>
        </div>

        {/* desktop icons */}
        <div className="desk-icons">
          {APPS.filter((a) => !['wpepe', 'prices'].includes(a.id)).map((a) => (
            <button key={a.id} className="desk-icon" onClick={() => launch(a)} onDoubleClick={() => launch(a)}>
              <span className="di-img">{a.icon}</span>
              <span className="di-label">{a.title}</span>
            </button>
          ))}
        </div>

        {/* sticky note */}
        <div className="sticky-note hide-sm">
          <b>TODO.txt</b>
          <p>☑ learn what a stop loss is</p>
          <p>☐ stop 125x-ing the rent</p>
          <p>☐ reach the Moon Pond</p>
          <p>☐ join the airdrop 🪂</p>
          <p>☐ type “ribbit” 🤫</p>
        </div>

        {/* windows */}
        <div className="windows">
          {(mobile ? open : order.filter((id) => open.includes(id))).map((id) => {
            const app = APPS.find((a) => a.id === id);
            return (
              <div key={id} id={`win-${id}`} className="win-slot">
                <OsWindow
                  app={app}
                  pos={pos[id] || { x: 100, y: 60 }}
                  z={10 + order.indexOf(id)}
                  active={order[order.length - 1] === id}
                  mobile={mobile}
                  onFocus={() => focus(id)}
                  onClose={() => close(id)}
                  onMin={() => close(id)}
                  onMove={(p) => setPos((s) => ({ ...s, [id]: p }))}
                >
                  {content(id)}
                </OsWindow>
              </div>
            );
          })}
        </div>

        {/* frog assistant */}
        <div className="assistant hide-sm">
          <div className="assistant-bubble" key={tip}>{TIPS[tip]}</div>
          <button className="assistant-frog" onClick={() => { croak(); setTip((v) => (v + 1) % TIPS.length); }} aria-label="Frog assistant">
            <Frog mood={tip % 2 ? 'wise' : 'happy'} size={86} />
          </button>
        </div>

        {/* dock */}
        <div className="dock">
          {APPS.map((a) => (
            <button key={a.id} className={`dock-item ${open.includes(a.id) ? 'running' : ''}`} onClick={() => launch(a)} title={a.title}>
              <span>{a.icon}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- long meme page ---------- */}
      <Marquee />
      <AirdropSection />
      <Marquee reverse />
      <section id="legend" className="meme-section">
        <h2 className="meme-h2">📜 The Legend of WPEPE</h2>
        <p className="meme-sub">Six chapters. One frog. Zero stop losses (at first).</p>
        <StoryComic />
      </section>
      <Marquee reverse />

      <section className="meme-section">
        <h2 className="meme-h2">🐸 Why join the swamp?</h2>
        <div className="why-grid">
          {[
            ['📡', 'Real prices', 'Live market prices, every second. The swamp never sleeps.'],
            ['🪰', 'Fake flies', '10,000 demo USDT. Get rekt for free, learn for real.'],
            ['⚡', '125x leaps', 'Market, limit, stop, TP/SL. Leap like a pro frog.'],
            ['🎚', 'The Lily Lever', 'Bend the demo price. Rehearse every pump and dump.'],
            ['📰', 'News Swamp', 'Daily & weekly crypto headlines in one pond.'],
            ['🎓', 'Frog Academy', 'From tadpole to trader in ten short guides.'],
          ].map(([i, t, d], k) => (
            <div key={t} className="why-card" style={{ '--r': `${(k % 3) - 1}deg` }}>
              <span className="why-icon">{i}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tokenomics" className="meme-section alt">
        <h2 className="meme-h2">📊 Tokenomics <span className="concept-badge">concept</span></h2>
        <p className="meme-sub">420.69 trillion frogs of pure meme energy. Proposed, not issued.</p>
        <Tokenomics />
      </section>

      <section id="roadmap" className="meme-section">
        <h2 className="meme-h2">🗺 Roadmap to the Moon Pond</h2>
        <p className="meme-sub">Phases 1 and 2 are live today. Click “Enter the Swamp” to see them.</p>
        <Roadmap />
      </section>

      <section className="meme-section alt">
        <h2 className="meme-h2">🪷 How to join the swamp</h2>
        <div className="steps">
          {[
            ['1', 'Open the Swamp Exchange', 'No sign-up, no wallet, no money.', '/trade/BTCUSDT'],
            ['2', 'Grab free demo flies', 'You start with 10,000 demo USDT. Tap “+ Deposit” for more.', '/trade/BTCUSDT'],
            ['3', 'Leap with a plan', 'Set a stop loss before every 125x. Wally insists.', '/learn/take-profit-stop-loss'],
            ['4', 'Croak with the frens', 'Make memes, share them, read the swamp news.', '/news'],
          ].map(([n, t, d, to]) => (
            <Link key={n} to={to} className="step">
              <span className="step-n">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="meme" className="meme-section">
        <h2 className="meme-h2">🎨 Meme Maker 3000</h2>
        <p className="meme-sub">Make a WPEPE meme in 5 seconds. Download it. Spread the croak.</p>
        <div className="maker-row">
          <div className="maker-box"><MemeMaker /></div>
          <div className="ribbit-box">
            <h3>Ribbit-o-meter</h3>
            <p>Click the frog. Climb from Egg to Legendary W.</p>
            <RibbitClicker size={170} />
          </div>
        </div>
      </section>

      <section className="meme-section alt">
        <h2 className="meme-h2">❓ Frog Asked Questions</h2>
        <Faq />
      </section>

      <section className="meme-section community">
        <h2 className="meme-h2">📣 Join the croak</h2>
        <p className="meme-sub">Official community channels are coming soon. Until then: practice, meme, repeat.</p>
        <div className="socials">
          {['𝕏 Twitter', '✈ Telegram', '💬 Discord'].map((s) => (
            <span key={s} className="social-btn" title="Coming soon">{s} <small>soon</small></span>
          ))}
        </div>
        <div className="final-cta">
          <Frog mood="diamond" size={140} />
          <div>
            <h3>The swamp is open. The lily pads are free.</h3>
            <div className="hero-win-cta">
              <Link to="/trade/BTCUSDT" className="meme-btn primary">🚀 Enter the Swamp</Link>
              <Link to="/whitepaper" className="meme-btn">📜 Read the litepaper</Link>
            </div>
          </div>
        </div>
      </section>

      <RecentJoinToasts />
      <footer className="meme-footer">
        <div className="stickers">
          <span className="stk s1">100% MEME</span>
          <span className="stk s2">0% REAL MONEY</span>
          <span className="stk s3">NOT FINANCIAL ADVICE</span>
          <span className="stk s4">RIBBIT ™</span>
        </div>
        <p>
          WPEPE is an educational meme project and demo trading playground. {TICKER} is a concept: no token has been
          issued, there is no contract address and no sale. Never send money to anyone claiming otherwise. Prices on the
          demo exchange can be modified on purpose and are not trading signals. The WPEPE frog is an original character.
        </p>
        <p className="muted">© {new Date().getFullYear()} WPEPE · Made in the swamp with 💚</p>
      </footer>
    </div>
  );
}

function Marquee({ reverse }) {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className={`marquee ${reverse ? 'rev' : ''}`} aria-hidden="true">
      <div className="marquee-track">
        {items.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}
