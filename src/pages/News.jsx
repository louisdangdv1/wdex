import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ex, MARKETS, SYMBOLS } from '../engine/exchange';
import { useRemote, fetchNews, fetchFearGreed, timeAgo } from '../lib/api';
import { fmt, fmtPct, cls } from '../utils';
import { CoinIcon, FearGreedGauge, NewsCard } from '../components/common';

const PERIODS = [
  ['today', 'Today'],
  ['week', 'This week'],
  ['all', 'All'],
];
const VIEWS = [
  ['feed', '▦ Feed'],
  ['digest', '☰ Daily digest'],
];
const COIN_WORDS = {
  BTC: /\b(bitcoin|btc)\b/i,
  ETH: /\b(ethereum|eth|ether)\b/i,
  SOL: /\b(solana|sol)\b/i,
  XRP: /\b(xrp|ripple)\b/i,
  BNB: /\bbnb\b/i,
  DOGE: /\b(dogecoin|doge)\b/i,
  ADA: /\b(cardano|ada)\b/i,
  AVAX: /\b(avalanche|avax)\b/i,
  LINK: /\b(chainlink|link)\b/i,
  LTC: /\b(litecoin|ltc)\b/i,
  TRX: /\b(tron|trx)\b/i,
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const dayKey = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const dayLabel = (t) => {
  const today = startOfToday();
  if (t === today) return 'Today';
  if (t === today - 86400000) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};
const countBy = (arr, fn) => {
  const m = new Map();
  for (const x of arr) for (const k of [].concat(fn(x))) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export default function News() {
  const news = useRemote('news', fetchNews);
  const fng = useRemote('fng', fetchFearGreed, { maxAge: 600_000, refresh: 600_000 });
  const [period, setPeriod] = useState('week');
  const [view, setView] = useState('feed');
  const [topic, setTopic] = useState('All');
  const [source, setSource] = useState('All');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(24);

  const all = news.data?.items || [];
  const weekAgo = Date.now() - 7 * 86400000;
  const inPeriod = useMemo(() => {
    const from = period === 'today' ? startOfToday() : period === 'week' ? weekAgo : 0;
    return all.filter((it) => it.time >= from);
  }, [all, period]);

  const topics = countBy(inPeriod, (it) => it.topics);
  const sources = countBy(inPeriod, (it) => it.source);
  const filtered = inPeriod.filter(
    (it) =>
      (topic === 'All' || it.topics.includes(topic)) &&
      (source === 'All' || it.source === source) &&
      (!q || `${it.title} ${it.summary}`.toLowerCase().includes(q.toLowerCase())),
  );

  // weekly stats
  const week = all.filter((it) => it.time >= weekAgo);
  const coinMentions = Object.entries(COIN_WORDS)
    .map(([c, re]) => [c, week.filter((it) => re.test(it.title)).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const busiestDay = countBy(week, (it) => dayKey(it.time))[0];
  const weekTopics = countBy(week, (it) => it.topics);

  // digest groups
  const groups = [];
  for (const it of filtered) {
    const k = dayKey(it.time);
    if (!groups.length || groups[groups.length - 1].day !== k) groups.push({ day: k, items: [] });
    groups[groups.length - 1].items.push(it);
  }

  const movers = [...SYMBOLS].sort((a, b) => Math.abs(ex.stats24(b).change) - Math.abs(ex.stats24(a).change)).slice(0, 5);

  return (
    <div className="page news-page">
      <div className="page-head">
        <div>
          <h1>Crypto News</h1>
          <p className="muted">
            Headlines from {news.data?.sources?.filter((s) => s.ok).map((s) => s.source).join(', ') || 'major crypto publishers'}.
            {news.updated && ` Updated ${timeAgo(news.updated)} · refreshes every 5 minutes.`}
          </p>
        </div>
        <div className="tabs-inline">
          {PERIODS.map(([k, l]) => (
            <button key={k} className={period === k ? 'active' : ''} onClick={() => { setPeriod(k); setLimit(24); }}>{l}</button>
          ))}
        </div>
      </div>

      {/* weekly summary */}
      {week.length > 0 && (
        <div className="stat-cards week-cards">
          <div className="stat-card"><label>Stories this week</label><b>{week.length}</b></div>
          <div className="stat-card"><label>Today so far</label><b>{all.filter((it) => it.time >= startOfToday()).length}</b></div>
          <div className="stat-card"><label>Hottest topic</label><b>{weekTopics.find(([t]) => t !== 'General')?.[0] || '–'}</b></div>
          <div className="stat-card"><label>Most mentioned coin</label><b>{coinMentions[0] ? `${coinMentions[0][0]} (${coinMentions[0][1]})` : '–'}</b></div>
          <div className="stat-card"><label>Busiest day</label><b>{busiestDay ? `${dayLabel(busiestDay[0])} (${busiestDay[1]})` : '–'}</b></div>
        </div>
      )}

      <div className="news-layout">
        <div>
          <div className="news-tools">
            <div className="chips">
              <button className={topic === 'All' ? 'chip active' : 'chip'} onClick={() => setTopic('All')}>All ({inPeriod.length})</button>
              {topics.map(([t, n]) => (
                <button key={t} className={topic === t ? 'chip active' : 'chip'} onClick={() => setTopic(t)}>{t} ({n})</button>
              ))}
            </div>
            <div className="news-tools-row">
              <input className="search-input" placeholder="Search headlines…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="All">All sources</option>
                {sources.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
              </select>
              <div className="tabs-inline">
                {VIEWS.map(([k, l]) => (
                  <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {news.loading && <div className="card muted">Loading the latest headlines…</div>}
          {news.error && !all.length && <div className="card muted">News feed is unavailable right now. Please try again later.</div>}
          {!news.loading && all.length > 0 && filtered.length === 0 && <div className="card muted">No stories match these filters.</div>}

          {view === 'feed' ? (
            <>
              <div className="news-grid">
                {filtered.slice(0, limit).map((it, i) => (
                  <NewsCard key={it.id} item={it} variant={i === 0 ? 'feature' : 'card'} />
                ))}
              </div>
              {filtered.length > limit && (
                <button className="btn ghost load-more" onClick={() => setLimit((l) => l + 24)}>
                  Load more ({filtered.length - limit} left)
                </button>
              )}
            </>
          ) : (
            <div className="digest">
              {groups.map((g) => {
                const top = countBy(g.items, (it) => it.topics).filter(([t]) => t !== 'General').slice(0, 3);
                return (
                  <div key={g.day} className="card digest-day">
                    <div className="digest-head">
                      <h2>{dayLabel(g.day)}</h2>
                      <span className="muted">{g.items.length} {g.items.length === 1 ? 'story' : 'stories'}</span>
                      <span className="spacer" />
                      {top.map(([t, n]) => <span key={t} className="news-tag">{t} · {n}</span>)}
                    </div>
                    {g.items.map((it) => <NewsCard key={it.id} item={it} variant="line" />)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="news-side">
          <div className="card">
            <div className="card-title">Trending topics this week</div>
            {weekTopics.filter(([t]) => t !== 'General').slice(0, 7).map(([t, n]) => (
              <button key={t} className="trend-row" onClick={() => { setTopic(t); setPeriod('week'); }}>
                <span>{t}</span>
                <span className="trend-bar"><i style={{ width: `${(n / (weekTopics[0]?.[1] || 1)) * 100}%` }} /></span>
                <b>{n}</b>
              </button>
            ))}
          </div>
          <div className="card">
            <div className="card-title">Coins in the headlines</div>
            {coinMentions.slice(0, 6).map(([c, n]) => {
              const s = `${c}USDT`;
              return (
                <Link key={c} to={MARKETS[s] ? `/trade/${s}` : '/markets'} className="coin-row">
                  <CoinIcon base={c} />
                  <span className="coin-name"><b>{c}</b><span className="muted">{n} {n === 1 ? 'story' : 'stories'}</span></span>
                  <span className="coin-price">{MARKETS[s] ? fmt(ex.mk[s].price, MARKETS[s].dp) : ''}</span>
                  {MARKETS[s] && <span className={`coin-right pill ${cls(ex.stats24(s).change)}`}>{fmtPct(ex.stats24(s).change)}</span>}
                </Link>
              );
            })}
          </div>
          <div className="card center">
            <div className="card-title">Market sentiment</div>
            {fng.data?.[0] ? <FearGreedGauge value={fng.data[0].value} label={fng.data[0].label} size={170} /> : <div className="muted">Loading…</div>}
          </div>
          <div className="card">
            <div className="card-title">Biggest movers on WDex</div>
            {movers.map((s) => (
              <Link key={s} to={`/trade/${s}`} className="coin-row">
                <CoinIcon base={MARKETS[s].base} />
                <span className="coin-name"><b>{MARKETS[s].base}</b><span className="muted">/USDT</span></span>
                <span className="coin-price">{fmt(ex.mk[s].price, MARKETS[s].dp)}</span>
                <span className={`coin-right pill ${cls(ex.stats24(s).change)}`}>{fmtPct(ex.stats24(s).change)}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
