import { Link } from 'react-router-dom';
import { ex, MARKETS, SYMBOLS } from '../engine/exchange';
import { useRemote, fetchGlobal, fetchFearGreed, fetchNews } from '../lib/api';
import { fmt, fmtPct, cls } from '../utils';
import { CoinIcon, CoinRow, FearGreedGauge, NewsCard, Section, Sparkline, fmtShort } from '../components/common';
import Converter from '../components/Converter';
import { ARTICLES } from '../data/learn';
import { AirdropBanner } from '../airdrop/fomo';

const HOT = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

const ANNOUNCEMENTS = [
  ['New', 'TradingView-style chart: 7 chart types, 11 indicators and drawing tools'],
  ['New', 'Crypto News hub with daily and weekly digests from 5 publishers'],
  ['Update', 'Markets page with 24h sparklines, favourites and sorting'],
  ['Update', 'Stop Market and Reduce-only orders are now available'],
  ['Listing', 'XRP, ADA, AVAX, LINK, LTC and TRX perpetuals are live'],
];

const FEATURES = [
  ['📡', 'Real-time prices', 'Every pair streams live trades from the market, second by second.'],
  ['🧪', 'Risk-free practice', 'Start with 10,000 demo USDT. Top up any time, reset whenever you want.'],
  ['⚡', 'Up to 125x leverage', 'Market, Limit and Stop orders with TP/SL, reduce-only and isolated margin.'],
  ['📊', 'Pro charting', 'Candles to Heikin Ashi, RSI, MACD, SuperTrend, Fibonacci and more.'],
  ['🎛', 'Price control lab', 'Push the price, set targets or create wicks to rehearse any scenario.'],
  ['📰', 'News & Academy', 'Daily crypto headlines and clear guides from first trade to risk management.'],
];

export default function Home() {
  const global = useRemote('global', fetchGlobal, { maxAge: 120_000, refresh: 120_000 });
  const fng = useRemote('fng', fetchFearGreed, { maxAge: 600_000, refresh: 600_000 });
  const news = useRemote('news', fetchNews);
  const { equity } = ex.equity();

  const byChange = [...SYMBOLS].sort((a, b) => ex.stats24(b).change - ex.stats24(a).change);
  const byVolume = [...SYMBOLS].sort((a, b) => ex.stats24(b).volume - ex.stats24(a).volume);
  const g = global.data;
  const f = fng.data?.[0];
  const items = news.data?.items || [];

  return (
    <div className="page home">
      <AirdropBanner />
      {/* ---------- hero ---------- */}
      <section className="hero">
        <div className="hero-text">
          <span className="hero-badge">● {SYMBOLS.length} live perpetual markets</span>
          <h1>
            Trade crypto futures.
            <br />
            <span className="grad">Zero real risk.</span>
          </h1>
          <p className="muted hero-sub">
            Real-time prices, up to 125x leverage and a pro chart, all on demo funds.
            Learn, test strategies and follow the market news in one place.
          </p>
          <div className="hero-cta">
            <Link to="/trade/BTCUSDT" className="btn primary lg">Start trading →</Link>
            <Link to="/markets" className="btn ghost lg">Explore markets</Link>
          </div>
          <div className="hero-stats">
            <div><b>{fmt(equity)}</b><span className="muted">Your equity (USDT)</span></div>
            <div><b>125x</b><span className="muted">Max leverage</span></div>
            <div><b>0.02%</b><span className="muted">Maker fee</span></div>
          </div>
        </div>
        <div className="hero-card card">
          <div className="card-title">Popular</div>
          {HOT.map((s) => (
            <Link key={s} to={`/trade/${s}`} className="hero-coin">
              <CoinIcon base={MARKETS[s].base} size={28} />
              <span className="coin-name">
                <b>{MARKETS[s].base}</b>
                <span className="muted">{fmt(ex.mk[s].price, MARKETS[s].dp)}</span>
              </span>
              <Sparkline sym={s} width={90} height={30} />
              <span className={`pill ${cls(ex.stats24(s).change)}`}>{fmtPct(ex.stats24(s).change)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- ticker ---------- */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...SYMBOLS, ...SYMBOLS].map((s, i) => {
            const ch = ex.stats24(s).change;
            return (
              <Link key={i} to={`/trade/${s}`} className="ticker-item" tabIndex={-1}>
                <CoinIcon base={MARKETS[s].base} size={16} /> <b>{MARKETS[s].base}</b> {fmt(ex.mk[s].price, MARKETS[s].dp)}{' '}
                <span className={cls(ch)}>{fmtPct(ch)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ---------- market overview ---------- */}
      <Section title="Market overview" link="/markets">
        <div className="overview-grid">
          <div className="card">
            <div className="card-title">🔥 Hot</div>
            {HOT.map((s) => <CoinRow key={s} sym={s} />)}
          </div>
          <div className="card">
            <div className="card-title">🚀 Top gainers</div>
            {byChange.slice(0, 5).map((s) => <CoinRow key={s} sym={s} />)}
          </div>
          <div className="card">
            <div className="card-title">📊 Top volume</div>
            {byVolume.slice(0, 5).map((s) => <CoinRow key={s} sym={s} right="volume" />)}
          </div>
          <div className="card pulse">
            <div className="card-title">🌍 Market pulse</div>
            {f ? <FearGreedGauge value={f.value} label={f.label} size={170} /> : <div className="muted center">Loading…</div>}
            <div className="pulse-stats">
              <div><span className="muted">Market cap</span><b>{g ? `$${fmtShort(g.marketCap)}` : '–'}</b>{g && <em className={cls(g.change)}>{fmtPct(g.change)}</em>}</div>
              <div><span className="muted">24h volume</span><b>{g ? `$${fmtShort(g.volume)}` : '–'}</b></div>
              <div><span className="muted">BTC dominance</span><b>{g ? `${g.btcDom.toFixed(1)}%` : '–'}</b></div>
              <div><span className="muted">ETH dominance</span><b>{g ? `${g.ethDom.toFixed(1)}%` : '–'}</b></div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- news ---------- */}
      <Section title="Latest crypto news" link="/news" linkText="All news →">
        {news.loading && <div className="muted">Loading headlines…</div>}
        {news.error && !items.length && <div className="muted">News is unavailable right now.</div>}
        {items.length > 0 && (
          <div className="home-news">
            <NewsCard item={items[0]} variant="feature" />
            <div className="home-news-list">
              {items.slice(1, 7).map((it) => <NewsCard key={it.id} item={it} variant="line" />)}
            </div>
          </div>
        )}
      </Section>

      {/* ---------- converter + announcements ---------- */}
      <div className="two-col" id="converter">
        <Section title="Quick converter">
          <Converter />
        </Section>
        <Section title="Announcements">
          <div className="card announce">
            {ANNOUNCEMENTS.map(([tag, text]) => (
              <div key={text} className="announce-row">
                <span className={`news-tag tag-${tag.toLowerCase()}`}>{tag}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ---------- features ---------- */}
      <Section title="Why WPEPE">
        <div className="feature-grid">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="card feature">
              <div className="feature-icon">{icon}</div>
              <h3>{title}</h3>
              <p className="muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- academy ---------- */}
      <Section title="WPEPE Academy" link="/learn" linkText="All guides →">
        <div className="learn-grid">
          {ARTICLES.slice(0, 4).map((a) => (
            <Link key={a.slug} to={`/learn/${a.slug}`} className="card learn-card">
              <div className="learn-icon">{a.icon}</div>
              <span className={`level level-${a.level.toLowerCase()}`}>{a.level}</span>
              <h3>{a.title}</h3>
              <p className="muted">{a.summary}</p>
              <span className="muted small-text">{a.minutes} min read</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- CTA ---------- */}
      <section className="cta-band">
        <div>
          <h2>Ready to place your first trade?</h2>
          <p className="muted">You already have {fmt(ex.acc.balance)} demo USDT available.</p>
        </div>
        <Link to="/trade/BTCUSDT" className="btn primary lg">Open the exchange →</Link>
      </section>
    </div>
  );
}
