import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ex } from '../engine/exchange';
import { fmt, cls } from '../utils';

const NAV = [
  ['/app', 'Home'],
  ['/markets', 'Markets'],
  ['/trade/BTCUSDT', 'Trade'],
  ['/news', 'News'],
  ['/learn', 'Learn'],
  ['/whitepaper', 'Litepaper'],
  ['/', '🐸 FrogOS'],
];

export default function SiteHeader() {
  const { equity, upnl } = ex.equity();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const isActive = (to) => (to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to.split('/').slice(0, 2).join('/')));

  return (
    <header className="topbar site-header">
      <Link to="/" className="logo" onClick={() => setOpen(false)}>
        🐸 W<span>PEPE</span>
      </Link>

      <button className="nav-toggle" onClick={() => setOpen((v) => !v)} aria-label="Menu">☰</button>
      <nav className={`site-nav ${open ? 'open' : ''}`}>
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to} className={isActive(to) ? 'active' : ''} onClick={() => setOpen(false)}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="account-box">
        <span className={`feed ${ex.feed}`}>
          ● {ex.feed === 'live' ? 'Live prices' : ex.feed === 'connecting' ? 'Connecting…' : 'Offline (simulated)'}
        </span>
        <div className="acc-stat">
          <label>Equity</label>
          <b>{fmt(equity)} USDT</b>
        </div>
        <div className="acc-stat hide-sm">
          <label>Unrealized PnL</label>
          <b className={cls(upnl)}>
            {upnl >= 0 ? '+' : ''}
            {fmt(upnl)}
          </b>
        </div>
        <button className="btn ghost icon-btn" onClick={() => ex.setSound(!ex.sound)} title={ex.sound ? 'Mute sounds' : 'Enable sounds'}>
          {ex.sound ? '🔊' : '🔇'}
        </button>
        <button className="btn ghost" onClick={() => ex.faucet()} title="Get 10,000 more demo USDT">
          + Deposit
        </button>
      </div>
    </header>
  );
}
