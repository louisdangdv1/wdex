import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ARTICLES, LEVELS, getArticle } from '../data/learn';

export function Learn() {
  const [level, setLevel] = useState('All');
  const list = ARTICLES.filter((a) => level === 'All' || a.level === level);
  return (
    <div className="page">
      <section className="learn-hero">
        <h1>WPEPE Academy</h1>
        <p className="muted">
          Short, practical guides about crypto futures. Read one, then try it right away on the demo exchange.
        </p>
        <div className="tabs-inline">
          {['All', ...LEVELS].map((l) => (
            <button key={l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>{l}</button>
          ))}
        </div>
      </section>
      <div className="learn-grid">
        {list.map((a) => (
          <Link key={a.slug} to={`/learn/${a.slug}`} className="card learn-card">
            <div className="learn-icon">{a.icon}</div>
            <span className={`level level-${a.level.toLowerCase()}`}>{a.level}</span>
            <h3>{a.title}</h3>
            <p className="muted">{a.summary}</p>
            <span className="muted small-text">{a.minutes} min read</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Article() {
  const { slug } = useParams();
  const a = getArticle(slug);
  if (!a) return <Navigate to="/learn" replace />;
  const idx = ARTICLES.indexOf(a);
  const next = ARTICLES[(idx + 1) % ARTICLES.length];
  return (
    <div className="page article-layout">
      <article className="article card">
        <Link to="/learn" className="muted small-text">← Academy</Link>
        <div className="article-icon">{a.icon}</div>
        <h1>{a.title}</h1>
        <div className="article-meta">
          <span className={`level level-${a.level.toLowerCase()}`}>{a.level}</span>
          <span className="muted">{a.minutes} min read</span>
        </div>
        <p className="lead">{a.summary}</p>
        {a.body.map(([type, content], i) =>
          type === 'h' ? (
            <h2 key={i}>{content}</h2>
          ) : type === 'ul' ? (
            <ul key={i}>{content.map((li) => <li key={li}>{li}</li>)}</ul>
          ) : (
            <p key={i}>{content}</p>
          ),
        )}
        <div className="article-cta">
          <Link to="/trade/BTCUSDT" className="btn primary">Practice on WPEPE →</Link>
          <Link to={`/learn/${next.slug}`} className="btn ghost">Next: {next.title}</Link>
        </div>
      </article>
      <aside className="article-side">
        <div className="card">
          <div className="card-title">More guides</div>
          {ARTICLES.filter((x) => x !== a).map((x) => (
            <Link key={x.slug} to={`/learn/${x.slug}`} className="side-link">
              <span>{x.icon}</span>
              <span>{x.title}</span>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
