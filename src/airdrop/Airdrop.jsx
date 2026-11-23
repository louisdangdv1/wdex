import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ex } from '../engine/exchange';
import { timeAgo } from '../lib/api';
import { useWallet, connect, signText, chainInfo } from '../wallet/wallet';
import WalletButton from '../wallet/WalletButton';
import Frog from '../meme/Frog';
import { AIRDROP, TASKS, TIERS, computePoints, estTokens, tierOf, signMessage, shortAddr } from './config';
import { useAirdropStats, useCountdown, fetchRecord, registerWallet, spinWheel, getSavedRef } from './api';

const fmtTokens = (n) => new Intl.NumberFormat('en-US', { notation: n >= 1e9 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n);
const pad = (n) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- pieces
export function Countdown({ big = false }) {
  const c = useCountdown();
  if (!c.ms) return <div className="countdown closed">Allowlist closed</div>;
  return (
    <div className={`countdown ${big ? 'big' : ''}`}>
      {[['d', c.d], ['h', c.h], ['m', c.m], ['s', c.s]].map(([l, v]) => (
        <div key={l} className="cd-cell">
          <b>{pad(v)}</b>
          <span>{{ d: 'days', h: 'hours', m: 'mins', s: 'secs' }[l]}</span>
        </div>
      ))}
    </div>
  );
}

export function GoalBar({ count = 0 }) {
  const pct = Math.min(100, (count / AIRDROP.goal) * 100);
  return (
    <div className="goal">
      <div className="goal-top">
        <span><b>{count.toLocaleString('en-US')}</b> frogs joined</span>
        <span className="muted">Goal {AIRDROP.goal.toLocaleString('en-US')}</span>
      </div>
      <div className="goal-bar"><i style={{ width: `${Math.max(pct, 1.5)}%` }} /></div>
    </div>
  );
}

function localTaskDone(id) {
  if (id === 'trade') return ex.acc.history.filter((h) => h.action === 'Open').length >= 3;
  if (id === 'meme') {
    try {
      return localStorage.getItem('wpepe.memeMade') === '1';
    } catch {
      return false;
    }
  }
  return false;
}

function LiveFeed({ stats }) {
  const recent = stats?.recent || [];
  return (
    <div className="card">
      <div className="card-title">🔴 Live: frogs joining</div>
      {recent.length === 0 && <p className="muted small-text">Be the very first frog on the allowlist.</p>}
      <div className="feed-list">
        {recent.slice(0, 8).map((r, i) => (
          <div key={r.addr + r.t} className="feed-row" style={{ animationDelay: `${i * 60}ms` }}>
            <span>🐸 <b>{r.addr}</b> joined</span>
            <span className="muted">{timeAgo(r.t)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Leaderboard({ stats }) {
  const top = stats?.top || [];
  return (
    <div className="card">
      <div className="card-title">🏆 Top referrers</div>
      {top.length === 0 && <p className="muted small-text">No referrals yet. Share your link and take #1.</p>}
      {top.map((t, i) => (
        <div key={t.addr} className="lb-row">
          <span className="lb-rank">{['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
          <b>{t.addr}</b>
          <span className="muted">{t.referrals} frens</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Lily Wheel
function LilyWheel({ record, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0);
  const [msg, setMsg] = useState('');
  const prizes = AIRDROP.spin.map(([p]) => p);
  const seg = 360 / prizes.length;
  const wait = Math.max(0, (record?.nextSpin || 0) - Date.now());
  const colors = ['#7CFC00', '#ffd84d', '#00d1ff', '#ff6bd6', '#a78bfa', '#5fd068', '#ff9f43'];

  const spin = async () => {
    if (!record || busy || wait > 0) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await spinWheel(record.address);
      const idx = prizes.indexOf(res.prize);
      const target = 360 * 6 + (360 - (idx * seg + seg / 2)); // land the prize under the pointer
      setRot((r) => r - (r % 360) + target);
      setTimeout(() => {
        setMsg(`🎉 +${res.prize} points!`);
        onUpdate(res.record);
        setBusy(false);
      }, 4200);
    } catch (e) {
      setMsg(e.message);
      if (e.data?.record) onUpdate(e.data.record);
      setBusy(false);
    }
  };

  const h = Math.floor(wait / 3600000);
  const m = Math.floor((wait % 3600000) / 60000);
  return (
    <div className="wheel-box">
      <div className="wheel-wrap">
        <div className="wheel-pointer">▼</div>
        <svg viewBox="-110 -110 220 220" className="wheel" style={{ transform: `rotate(${rot}deg)` }}>
          {prizes.map((p, i) => {
            const a0 = ((i * seg - 90) * Math.PI) / 180;
            const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
            const am = (a0 + a1) / 2;
            return (
              <g key={p}>
                <path d={`M0 0 L${100 * Math.cos(a0)} ${100 * Math.sin(a0)} A100 100 0 0 1 ${100 * Math.cos(a1)} ${100 * Math.sin(a1)} Z`} fill={colors[i % colors.length]} stroke="#111" strokeWidth="2" />
                <text x={64 * Math.cos(am)} y={64 * Math.sin(am)} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(am * 180) / Math.PI + 90} ${64 * Math.cos(am)} ${64 * Math.sin(am)})`} className="wheel-txt">{p}</text>
              </g>
            );
          })}
          <circle r="22" fill="#0c1c13" stroke="#111" strokeWidth="3" />
          <text textAnchor="middle" dominantBaseline="middle" fontSize="20">🐸</text>
        </svg>
      </div>
      <button className="meme-btn primary" disabled={!record || busy || wait > 0} onClick={spin}>
        {busy ? 'Spinning…' : wait > 0 ? `Next spin in ${h}h ${m}m` : '🎡 Spin the Lily Wheel'}
      </button>
      {msg && <div className="wheel-msg">{msg}</div>}
      <p className="muted small-text">One free spin every {AIRDROP.spinHours} hours. Up to 1,000 bonus points.</p>
    </div>
  );
}

// ---------------------------------------------------------------- dashboard
function Dashboard({ record, onUpdate, onEdit }) {
  const [copied, setCopied] = useState(false);
  const t = record.tier;
  const link = `${window.location.origin}/airdrop?ref=${record.code}`;
  const pct = t.next ? Math.min(100, ((record.points - t.min) / (t.next.min - t.min)) * 100) : 100;
  const shareText = `I just joined the $WPEPE frog allowlist 🐸 Estimated ${fmtTokens(record.tokens)} $WPEPE. Join with my link:`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <div className="card dash">
      <div className="dash-head">
        <div className="tier-badge">{t.icon}</div>
        <div>
          <span className="muted small-text">You’re on the allowlist ✔ · {shortAddr(record.address)}</span>
          <h2>{t.name} <small className="muted">×{t.mult}</small></h2>
        </div>
        <button className="btn ghost sm" onClick={onEdit}>Edit tasks</button>
      </div>

      <div className="dash-stats">
        <div><span>Points</span><b>{record.points.toLocaleString('en-US')}</b></div>
        <div><span>Est. $WPEPE*</span><b className="gold">{fmtTokens(record.tokens)}</b></div>
        <div><span>Frens invited</span><b>{record.referrals}</b></div>
        <div><span>Wheel bonus</span><b>{record.spinBonus}</b></div>
      </div>

      <div className="tier-progress">
        <div className="goal-top">
          <span>{t.icon} {t.name}</span>
          <span className="muted">{t.next ? `${(t.next.min - record.points).toLocaleString('en-US')} pts to ${t.next.icon} ${t.next.name}` : 'Max tier reached 🌕'}</span>
        </div>
        <div className="goal-bar"><i style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="ref-box">
        <span className="muted small-text">Your referral link · +{AIRDROP.refBonus} pts for you, +{AIRDROP.refWelcome} for each fren</span>
        <div className="ref-row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button className="btn primary sm" onClick={copy}>{copied ? '✔ Copied' : 'Copy'}</button>
        </div>
        <div className="share-row">
          <a className="share x" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(link)}`}>Share on 𝕏</a>
          <a className="share tg" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`}>Share on Telegram</a>
        </div>
      </div>

      <LilyWheel record={record} onUpdate={onUpdate} />
    </div>
  );
}

// ---------------------------------------------------------------- form
function RegisterForm({ wallet, record, onDone }) {
  const [x, setX] = useState(record?.x || '');
  const [tg, setTg] = useState('');
  const [email, setEmail] = useState('');
  const [ref, setRef] = useState(getSavedRef());
  const [tasks, setTasks] = useState(() => new Set(record?.tasks || []));
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // local tasks are detected automatically
  const localDone = useMemo(() => Object.fromEntries(TASKS.filter((t) => t.local).map((t) => [t.id, localTaskDone(t.id)])), []);
  useEffect(() => {
    setTasks((s) => {
      const n = new Set(s);
      for (const [id, ok] of Object.entries(localDone)) (ok ? n.add(id) : n.delete(id));
      return n;
    });
  }, [localDone]);

  const preview = computePoints({ tasks: [...tasks], ref: record ? record.ref : ref ? 'x' : null, referrals: record?.referrals, spinBonus: record?.spinBonus });
  const tier = tierOf(preview);

  const toggle = (t) => {
    if (t.local) return;
    if (t.link) window.open(t.link, '_blank', 'noopener');
    setTasks((s) => {
      const n = new Set(s);
      n.has(t.id) ? n.delete(t.id) : n.add(t.id);
      return n;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!wallet.address) return setErr('Connect your wallet first.');
    if (!/^@?[A-Za-z0-9_]{2,32}$/.test(x.trim())) return setErr('Please enter your X (Twitter) handle.');
    if (!agree) return setErr('Please tick the confirmation box.');
    setBusy(true);
    try {
      const message = signMessage(wallet.address, new Date().toISOString());
      const signature = await signText(message);
      const res = await registerWallet({ address: wallet.address, message, signature, x, tg, email, ref, tasks: [...tasks] });
      onDone(res.record, res.created);
    } catch (e2) {
      setErr(e2?.code === 4001 ? 'Signature cancelled in your wallet.' : e2.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card reg-form" onSubmit={submit}>
      <div className="reg-step">
        <span className="step-dot">1</span>
        <div>
          <b>Connect your wallet</b>
          <p className="muted small-text">MetaMask recommended. We only read your address — nothing is ever sent from your wallet.</p>
        </div>
        <div className="reg-wallet">
          {wallet.address ? (
            <span className="ok-pill">✔ {shortAddr(wallet.address)} · {chainInfo(wallet.chainId).name}</span>
          ) : (
            <WalletButton />
          )}
        </div>
      </div>

      <div className="reg-step col">
        <div className="reg-step-head"><span className="step-dot">2</span><b>Tell us who you are</b></div>
        <div className="reg-grid">
          <label>X (Twitter) handle *<input value={x} onChange={(e) => setX(e.target.value)} placeholder="@yourfrog" maxLength={33} /></label>
          <label>Telegram handle<input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="@yourfrog" maxLength={33} /></label>
          <label>Email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@swamp.xyz" maxLength={254} /></label>
          <label>Referral code<input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="FROG123ABC" maxLength={14} disabled={Boolean(record)} /></label>
        </div>
      </div>

      <div className="reg-step col">
        <div className="reg-step-head"><span className="step-dot">3</span><b>Complete quests for bonus points</b></div>
        <div className="quests">
          {TASKS.map((t) => {
            const soon = !t.local && !t.link;
            const done = tasks.has(t.id);
            return (
              <button type="button" key={t.id} className={`quest ${done ? 'done' : ''} ${soon ? 'soon' : ''}`} onClick={() => !soon && toggle(t)} disabled={soon}>
                <span className="q-check">{done ? '✅' : '⬜'}</span>
                <span className="q-label">
                  {t.label}
                  {t.local && !done && <small> · {t.id === 'trade' ? <Link to="/trade/BTCUSDT">go trade</Link> : <Link to="/#meme">open Meme Maker</Link>}</small>}
                  {soon && <small> · link coming soon</small>}
                </span>
                <span className="q-pts">+{t.points}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="estimate">
        <div>
          <span className="muted small-text">Your estimate</span>
          <b>{preview.toLocaleString('en-US')} pts</b>
        </div>
        <div>
          <span className="muted small-text">Tier</span>
          <b>{tier.icon} {tier.name} ×{tier.mult}</b>
        </div>
        <div>
          <span className="muted small-text">Est. $WPEPE*</span>
          <b className="gold">{fmtTokens(estTokens(preview))}</b>
        </div>
      </div>

      <label className="agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I understand $WPEPE is a concept, joining the allowlist is free and does not guarantee any tokens, and WPEPE will never ask for my seed phrase or funds.</span>
      </label>
      {err && <div className="form-err">⚠ {err}</div>}
      <button className="meme-btn primary big-btn" type="submit" disabled={busy}>
        {busy ? 'Check your wallet…' : record ? '✍ Sign & update' : '✍ Sign & join the allowlist'}
      </button>
      <p className="muted small-text">Signing is free (no gas). Your email is only used for allowlist news and is never shown publicly.</p>
    </form>
  );
}

// ---------------------------------------------------------------- page
export default function Airdrop() {
  const wallet = useWallet();
  const stats = useAirdropStats();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [statsOverride, setStatsOverride] = useState(null);

  useEffect(() => {
    setRecord(null);
    setEdit(false);
    if (!wallet.address) return;
    setLoading(true);
    fetchRecord(wallet.address)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, [wallet.address]);

  const s = statsOverride || stats.data;
  const onDone = async (rec, created) => {
    setRecord(rec);
    setEdit(false);
    if (created) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
    }
    try {
      const r = await fetch('/.netlify/functions/airdrop?stats=1&t=' + Date.now());
      setStatsOverride(await r.json());
    } catch { /* ignore */ }
  };

  return (
    <div className="page airdrop-page">
      {confetti && (
        <div className="frog-rain" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.12}s`, animationDuration: `${2.4 + (i % 5) * 0.4}s`, fontSize: 18 + (i % 4) * 8 }}>{['🐸', '🎉', '💚', '🪂', '💎'][i % 5]}</span>
          ))}
        </div>
      )}

      <section className="air-hero">
        <div className="air-hero-text">
          <span className="live-pill">● LIVE</span>
          <h1 className="air-title">$WPEPE Airdrop <span>Allowlist</span></h1>
          <p className="muted">Connect your wallet, finish a few quests and lock your spot before the swamp gate closes. Free to join. No gas. No funds.</p>
          <Countdown big />
          <GoalBar count={s?.count || 0} />
        </div>
        <div className="air-hero-frog">
          <div className="parachute">🪂</div>
          <Frog mood="diamond" size={190} />
        </div>
      </section>

      <div className="tier-strip">
        {TIERS.map(([min, name, icon, mult]) => (
          <div key={name} className={`tier-chip ${record?.tier.name === name ? 'on' : ''}`}>
            <span>{icon}</span>
            <b>{name}</b>
            <small>{min.toLocaleString('en-US')}+ pts · ×{mult}</small>
          </div>
        ))}
      </div>

      <div className="air-layout">
        <div>
          {loading && <div className="card muted">Checking your allowlist status…</div>}
          {!loading && record && !edit && <Dashboard record={record} onUpdate={setRecord} onEdit={() => setEdit(true)} />}
          {!loading && (!record || edit) && <RegisterForm key={wallet.address || 'none'} wallet={wallet} record={record} onDone={onDone} />}
          {!wallet.address && (
            <div className="connect-hint">
              <Frog mood="happy" size={70} />
              <span>Connect a wallet to see your points, tier and referral link.</span>
              <button className="btn primary" onClick={() => connect()}>🦊 Connect MetaMask</button>
            </div>
          )}
        </div>
        <aside className="air-side">
          <LiveFeed stats={s} />
          <Leaderboard stats={s} />
          <div className="card safety">
            <div className="card-title">🛡 Stay safe, fren</div>
            <ul className="plain-list">
              <li>We will <b>never</b> DM you first or ask for your seed phrase.</li>
              <li>Joining only needs a free signature — never approve a transaction.</li>
              <li>There is no presale and no contract address yet.</li>
              <li>Only trust links on this website.</li>
            </ul>
          </div>
        </aside>
      </div>

      <p className="air-disclaimer muted small-text">
        * Points and estimated $WPEPE are for fun and ranking only. $WPEPE is a concept: no token has been issued and none is
        promised. If a token is ever created, any distribution would follow its own published terms, which may differ from these
        estimates. Not financial advice.
      </p>
    </div>
  );
}
