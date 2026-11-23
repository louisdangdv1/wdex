import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet, connect, disconnect, autoConnect, chainInfo, hasWallet, isMobile, metamaskDeepLink, clearError } from './wallet';
import { shortAddr } from '../airdrop/config';

let auto = false;

export default function WalletButton({ variant = 'app' }) {
  const w = useWallet();
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auto) {
      auto = true;
      autoConnect();
    }
  }, []);

  const cls = variant === 'meme' ? 'wallet-btn meme' : 'wallet-btn';

  if (!w.address) {
    return (
      <>
        <button className={cls} onClick={() => connect()} disabled={w.connecting}>
          <span className="fox">🦊</span> {w.connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
        {w.error && (
          <div className="wallet-modal-backdrop" onClick={clearError}>
            <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
              {w.error === 'no-wallet' || !hasWallet() ? (
                <>
                  <div className="wm-icon">🦊</div>
                  <h3>MetaMask not found</h3>
                  <p className="muted">Install the MetaMask extension, or open WPEPE inside the MetaMask mobile app.</p>
                  <div className="wm-actions">
                    {isMobile() ? (
                      <a className="btn primary" href={metamaskDeepLink()}>Open in MetaMask app</a>
                    ) : (
                      <a className="btn primary" href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">Install MetaMask</a>
                    )}
                    <button className="btn ghost" onClick={clearError}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="wm-icon">🐸</div>
                  <h3>{w.error === 'rejected' ? 'Connection cancelled' : 'Could not connect'}</h3>
                  <p className="muted">{w.error === 'rejected' ? 'You closed the wallet request. Try again whenever you are ready.' : String(w.error)}</p>
                  <div className="wm-actions">
                    <button className="btn primary" onClick={() => connect()}>Try again</button>
                    <button className="btn ghost" onClick={clearError}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  const chain = chainInfo(w.chainId);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(w.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };

  return (
    <div className="wallet-wrap">
      <button className={`${cls} connected`} onClick={() => setMenu((v) => !v)}>
        {w.wallet?.icon ? <img src={w.wallet.icon} alt="" width="16" height="16" /> : <span className="fox">🦊</span>}
        <span className="wallet-dot" /> {shortAddr(w.address)}
      </button>
      {menu && (
        <>
          <div className="dd-backdrop" onClick={() => setMenu(false)} />
          <div className="wallet-menu">
            <div className="wmenu-head">
              <span className="muted small-text">{w.wallet?.name || 'Wallet'} · {chain.name}</span>
              <b>{shortAddr(w.address)}</b>
              <span>{w.balance == null ? '—' : `${w.balance.toFixed(4)} ${chain.symbol}`}</span>
            </div>
            <button onClick={copy}>{copied ? '✔ Copied' : '📋 Copy address'}</button>
            <a href={`${chain.explorer}/address/${w.address}`} target="_blank" rel="noopener noreferrer">🔎 View on explorer</a>
            <Link to="/airdrop" onClick={() => setMenu(false)}>🪂 My airdrop</Link>
            <button className="danger" onClick={() => { disconnect(); setMenu(false); }}>⏏ Disconnect</button>
          </div>
        </>
      )}
    </div>
  );
}
