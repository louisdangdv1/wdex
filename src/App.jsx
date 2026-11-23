import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTick } from './utils';
import SiteHeader from './components/SiteHeader';
import Footer from './components/Footer';
import Toasts from './components/Toasts';
import Home from './pages/Home';
import Markets from './pages/Markets';
import Trade from './pages/Trade';
import News from './pages/News';
import { Learn, Article } from './pages/Learn';
import Landing from './meme/Landing';
import Whitepaper from './meme/Whitepaper';

const TITLES = {
  '/': 'WPEPE 🐸 The Wise Frog’s Swamp',
  '/app': 'WPEPE – Crypto Futures Trading',
  '/whitepaper': 'Litepaper · WPEPE',
  '/markets': 'Markets · WPEPE',
  '/news': 'Crypto News · WPEPE',
  '/learn': 'Academy · WPEPE',
};

/** Scroll to top (or to #anchor) on navigation and set the page title */
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) return el.scrollIntoView({ behavior: 'smooth' });
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  useEffect(() => {
    document.title = pathname.startsWith('/trade/')
      ? `${pathname.split('/')[2]} · WPEPE Futures`
      : TITLES[pathname] || (pathname.startsWith('/learn/') ? 'Academy · WPEPE' : 'WPEPE');
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="page center not-found">
      <h1>404</h1>
      <p className="muted">This page doesn’t exist.</p>
      <Link to="/" className="btn primary">Back to home</Link>
    </div>
  );
}

export default function App() {
  useTick();
  const { pathname } = useLocation();
  const isLanding = pathname === '/';
  return (
    <>
      <RouteEffects />
      {!isLanding && <SiteHeader />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Home />} />
        <Route path="/whitepaper" element={<Whitepaper />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/trade" element={<Navigate to="/trade/BTCUSDT" replace />} />
        <Route path="/trade/:sym" element={<Trade />} />
        <Route path="/news" element={<News />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:slug" element={<Article />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!pathname.startsWith('/trade') && !isLanding && <Footer />}
      <Toasts />
    </>
  );
}
