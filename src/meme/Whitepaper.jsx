import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Frog from './Frog';
import { LITEPAPER } from './content';
import { Tokenomics, Roadmap } from './sections';

export default function Whitepaper() {
  const [active, setActive] = useState(LITEPAPER[0].id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    LITEPAPER.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="page paper-layout">
      <aside className="paper-toc">
        <div className="card">
          <div className="card-title">Contents</div>
          {LITEPAPER.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''}>{s.title}</a>
          ))}
          <button className="btn ghost paper-print" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
        </div>
      </aside>

      <article className="paper card">
        <header className="paper-head">
          <Frog mood="wise" size={110} />
          <div>
            <span className="paper-kicker">LITEPAPER · v1.0</span>
            <h1>WPEPE: the Wise Frog’s Swamp</h1>
            <p className="muted">A meme-powered practice swamp for crypto futures. Real prices, fake flies, zero rekt.</p>
            <div className="paper-badges">
              <span>📅 {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
              <span>🐸 Community draft</span>
              <span>⚠ No token issued</span>
            </div>
          </div>
        </header>

        {LITEPAPER.map((s) => (
          <section key={s.id} id={s.id} className="paper-section">
            <h2>{s.title}</h2>
            {s.blocks.map((b, i) => {
              if (b[0] === 'p') return <p key={i}>{b[1]}</p>;
              if (b[0] === 'ul') return <ul key={i}>{b[1].map((li) => <li key={li}>{li}</li>)}</ul>;
              if (b[0] === 'tokenomics') return <div key={i} className="paper-embed"><Tokenomics /></div>;
              if (b[0] === 'roadmap') return <div key={i} className="paper-embed"><Roadmap /></div>;
              return null;
            })}
          </section>
        ))}

        <div className="paper-end">
          <Link to="/" className="btn ghost">← Back to FrogOS</Link>
          <Link to="/trade/BTCUSDT" className="btn primary">Enter the Swamp Exchange →</Link>
        </div>
      </article>
    </div>
  );
}
