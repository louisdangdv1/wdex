import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { timeAgo } from '../lib/api';
import Frog from '../meme/Frog';
import { AIRDROP, TIERS } from './config';
import { useAirdropStats, useCountdown } from './api';
import { Countdown, GoalBar } from './Airdrop';

const pad = (n) => String(n).padStart(2, '0');

/** Thin sticky strip: live allowlist status */
export function AirdropBanner({ variant = 'app' }) {
  const { data } = useAirdropStats();
  const c = useCountdown();
  if (!c.ms) return null;
  return (
    <Link to="/airdrop" className={`air-banner ${variant}`}>
      <span className="ab-live">● LIVE</span>
      <span>🪂 <b>$WPEPE Airdrop</b> allowlist is open</span>
      {data && <span className="ab-count">🐸 {data.count.toLocaleString('en-US')} frogs joined</span>}
      <span className="ab-time">⏳ {c.d}d {pad(c.h)}:{pad(c.m)}:{pad(c.s)}</span>
      <span className="ab-cta">Join now →</span>
    </Link>
  );
}

/** Popups of real recent registrations (social proof) */
export function RecentJoinToasts() {
  const { data } = useAirdropStats();
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const recent = (data?.recent || []).filter((r) => Date.now() - r.t < 7 * 86400000);
  useEffect(() => {
    if (!recent.length) return undefined;
    let hide;
    const t = setInterval(() => {
      setI((v) => (v + 1) % recent.length);
      setShow(true);
      hide = setTimeout(() => setShow(false), 4500);
    }, 11000);
    const first = setTimeout(() => setShow(true), 4000);
    const firstHide = setTimeout(() => setShow(false), 8500);
    return () => {
      clearInterval(t);
      clearTimeout(hide);
      clearTimeout(first);
      clearTimeout(firstHide);
    };
  }, [recent.length]);
  const r = recent[i % (recent.length || 1)];
  if (!r) return null;
  return (
    <Link to="/airdrop" className={`join-toast ${show ? 'show' : ''}`}>
      <Frog mood="happy" size={34} />
      <span>
        <b>{r.addr}</b> joined the allowlist
        <small>{timeAgo(r.t)} · tap to join</small>
      </span>
    </Link>
  );
}

/** Compact window for FrogOS */
export function AirdropWin() {
  const { data } = useAirdropStats();
  return (
    <div className="airdrop-win">
      <div className="aw-head">
        <span className="parachute small">🪂</span>
        <div>
          <b>$WPEPE ALLOWLIST</b>
          <span>Free · No gas · Ends soon</span>
        </div>
      </div>
      <Countdown />
      <GoalBar count={data?.count || 0} />
      <Link to="/airdrop" className="meme-btn primary">🦊 Connect &amp; claim spot</Link>
    </div>
  );
}

/** Big section for the landing page */
export function AirdropSection() {
  const { data } = useAirdropStats();
  return (
    <section id="airdrop" className="meme-section airdrop-section">
      <div className="as-grid">
        <div>
          <span className="live-pill">● LIVE NOW</span>
          <h2 className="meme-h2">🪂 The Great Frog Airdrop</h2>
          <p className="meme-sub">
            Connect MetaMask, sign once (free, no gas), finish quests and climb from Tadpole to Moon Frog.
            Invite frens for +{AIRDROP.refBonus} points each. Spin the Lily Wheel every day.
          </p>
          <Countdown big />
          <GoalBar count={data?.count || 0} />
          <div className="hero-win-cta" style={{ marginTop: 18 }}>
            <Link to="/airdrop" className="meme-btn primary">🦊 Join the allowlist</Link>
            <Link to="/whitepaper#tokenomics" className="meme-btn">📊 Tokenomics</Link>
          </div>
        </div>
        <div className="as-tiers">
          {TIERS.map(([min, name, icon, mult], k) => (
            <div key={name} className="as-tier" style={{ '--r': `${(k % 2 ? 1 : -1) * 1.2}deg` }}>
              <span className="as-icon">{icon}</span>
              <b>{name}</b>
              <small>{min.toLocaleString('en-US')}+ pts</small>
              <em>×{mult}</em>
            </div>
          ))}
          <div className="as-frog"><Frog mood="diamond" size={120} /></div>
        </div>
      </div>
      <p className="concept-note">⚠ Points and estimated $WPEPE are for fun and ranking. No token has been issued and none is guaranteed. Never share your seed phrase.</p>
    </section>
  );
}
