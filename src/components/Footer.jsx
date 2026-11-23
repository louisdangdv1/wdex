import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-cols">
        <div className="footer-brand">
          <div className="logo">🐸 W<span>PEPE</span></div>
          <p className="muted">
            A perpetual-futures trading playground with real-time market prices and demo funds.
            Practice strategies without risking real money.
          </p>
        </div>
        <div>
          <h4>Products</h4>
          <Link to="/trade/BTCUSDT">Futures trading</Link>
          <Link to="/markets">Markets</Link>
          <Link to="/app#converter">Converter</Link>
          <Link to="/whitepaper">Litepaper</Link>
          <Link to="/">FrogOS</Link>
        </div>
        <div>
          <h4>Learn</h4>
          <Link to="/learn">Academy</Link>
          <Link to="/news">Crypto news</Link>
          <Link to="/learn/perpetual-futures">What are perpetuals?</Link>
        </div>
        <div>
          <h4>Data sources</h4>
          <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer">CoinGecko</a>
          <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" rel="noopener noreferrer">Fear &amp; Greed Index</a>
          <a href="https://github.com/louisdangdv1/wdex" target="_blank" rel="noopener noreferrer">Source code</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} WPEPE · Demo platform</span>
        <span className="muted">
          Not financial advice. All balances are virtual. News belongs to the linked publishers.
        </span>
      </div>
    </footer>
  );
}
