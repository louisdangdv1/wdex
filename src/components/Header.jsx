import { ex, SYMBOLS, MARKETS } from '../engine/exchange';
import { fmt, fmtPct, cls } from '../utils';

export default function Header({ sym, setSym }) {
  const { equity, upnl } = ex.equity();

  return (
    <header className="topbar">
      <div className="logo">
        ⚡ W<span>Dex</span>
      </div>

      <nav className="sym-tabs">
        {SYMBOLS.map((s) => {
          const ch = ex.stats24(s).change;
          return (
            <button key={s} className={s === sym ? 'active' : ''} onClick={() => setSym(s)}>
              <b>{MARKETS[s].base}</b>
              <span>{fmt(ex.mk[s].price, MARKETS[s].dp)}</span>
              <span className={cls(ch)}>{fmtPct(ch)}</span>
            </button>
          );
        })}
      </nav>

      <div className="account-box">
        <span className={`feed ${ex.feed}`}>
          ● {ex.feed === 'live' ? 'Live prices' : ex.feed === 'connecting' ? 'Connecting…' : 'Offline (simulated)'}
        </span>
        <div className="acc-stat">
          <label>Equity</label>
          <b>{fmt(equity)} USDT</b>
        </div>
        <div className="acc-stat">
          <label>Unrealized PnL</label>
          <b className={cls(upnl)}>
            {upnl >= 0 ? '+' : ''}
            {fmt(upnl)}
          </b>
        </div>
        <div className="acc-stat">
          <label>Available</label>
          <b>{fmt(ex.acc.balance)}</b>
        </div>
        <button
          className="btn ghost icon-btn"
          onClick={() => ex.setSound(!ex.sound)}
          title={ex.sound ? 'Mute sounds' : 'Enable sounds'}
        >
          {ex.sound ? '🔊' : '🔇'}
        </button>
        <button className="btn ghost" onClick={() => ex.faucet()} title="Get 10,000 more demo USDT">
          + Deposit
        </button>
      </div>
    </header>
  );
}
