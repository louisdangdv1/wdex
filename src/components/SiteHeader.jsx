import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ex } from '../engine/exchange';
import { fmt, cls } from '../utils';
import WalletButton from '../wallet/WalletButton';

const NAV = [
  ['/app', 'Home'],
  ['/markets', 'Markets'],
  ['/trade/BTCUSDT', 'Trade'],
  ['/airdrop', '🪂 Airdrop', 'LIVE'],
  ['/news', 'News'],
  ['/learn', 'Learn'],
  ['/whitepaper', 'Litepaper'],
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
        {NAV.map(([to, label, badge]) => (
          <NavLink key={to} to={to} className={`${isActive(to) ? 'active' : ''} ${badge ? 'hot' : ''}`} onClick={() => setOpen(false)}>
            {label}
            {badge && <span className="nav-badge">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="account-box">
        <span className={`feed hide-md ${ex.feed}`} title={ex.feed === 'live' ? 'Live prices' : ex.feed === 'connecting' ? 'Connecting…' : 'Offline (simulated)'}>
          ● {ex.feed === 'live' ? 'Live' : ex.feed === 'connecting' ? '…' : 'Offline'}
        </span>
        <div className="acc-stat">
          <label>Equity</label>
          <b>{fmt(equity)} USDT</b>
        </div>
        <div className="acc-stat hide-md">
          <label>Unrealized PnL</label>
          <b className={cls(upnl)}>
            {upnl >= 0 ? '+' : ''}
            {fmt(upnl)}
          </b>
        </div>
        <button className="btn ghost icon-btn" onClick={() => ex.setSound(!ex.sound)} title={ex.sound ? 'Mute sounds' : 'Enable sounds'}>
          {ex.sound ? '🔊' : '🔇'}
        </button>
        <button className="btn ghost hide-sm" onClick={() => ex.faucet()} title="Get 10,000 more demo USDT">
          + Deposit
        </button>
        <WalletButton />
      </div>
    </header>
  );
}
