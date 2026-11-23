import { useState } from 'react';
import { ex, MARKETS, SYMBOLS } from '../engine/exchange';
import { useRemote, fetchUsdVnd } from '../lib/api';
import { CoinIcon } from './common';

const FIATS = [
  ['USDT', 'Tether (≈ USD)'],
  ['VND', 'Vietnamese đồng'],
];
const ASSETS = [...SYMBOLS.map((s) => MARKETS[s].base), 'USDT'];

const usdPrice = (base) => (base === 'USDT' ? 1 : ex.mk[`${base}USDT`].price);

export default function Converter() {
  const { data: vnd } = useRemote('usdvnd', fetchUsdVnd, { maxAge: 3600_000, refresh: 3600_000 });
  const [from, setFrom] = useState('BTC');
  const [to, setTo] = useState('USDT');
  const [amount, setAmount] = useState('1');

  const usdVnd = vnd || 25500;
  // price of 1 unit of `code` in USD (VND handled via the FX rate)
  const toUsd = (code) => (code === 'VND' ? 1 / usdVnd : usdPrice(code));
  const unit = usdPrice(from) / toUsd(to); // 1 FROM in TO
  const result = (parseFloat(amount) || 0) * unit;
  const dp = to === 'VND' ? 0 : result >= 1000 ? 2 : result >= 1 ? 4 : 8;

  const swap = () => {
    if (to === 'VND') return;
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="converter card">
      <div className="conv-row">
        <label className="conv-field">
          <span className="muted">From</span>
          <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="conv-select">
          <CoinIcon base={from} size={20} />
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {ASSETS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <button className="conv-swap" onClick={swap} title="Swap" disabled={to === 'VND'}>⇅</button>
      <div className="conv-row">
        <div className="conv-field">
          <span className="muted">To</span>
          <b className="conv-result">
            {result.toLocaleString('en-US', { maximumFractionDigits: dp })}
          </b>
        </div>
        <div className="conv-select">
          {to !== 'VND' && <CoinIcon base={to} size={20} />}
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {[...ASSETS.filter((a) => a !== from), 'VND'].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="muted small-text">
        1 {from} ≈ {unit.toLocaleString('en-US', { maximumFractionDigits: to === 'VND' ? 0 : 8 })} {to}
        {to === 'VND' && ` · USD/VND ${Math.round(usdVnd).toLocaleString('en-US')}`}
      </div>
      <p className="muted small-text">Prices follow the WPEPE exchange · {FIATS.map(([c, n]) => `${c}: ${n}`).join(' · ')}</p>
    </div>
  );
}
