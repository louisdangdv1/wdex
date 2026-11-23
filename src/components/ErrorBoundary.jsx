import { Component } from 'react';

/** Catches render errors so the user sees a recovery screen instead of a black page */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('WPEPE crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    // navigating to another page clears the error
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  resetData = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('wdex.'))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash-card">
          <div className="crash-frog">🐸💥</div>
          <h1>Ribbit… something broke</h1>
          <p className="muted">The frog tripped over a lily pad. Your demo balance is safe.</p>
          <code>{String(this.state.error?.message || this.state.error).slice(0, 200)}</code>
          <div className="crash-actions">
            <button className="btn primary" onClick={() => window.location.reload()}>Reload page</button>
            <button className="btn ghost" onClick={() => (window.location.href = '/')}>Go to home</button>
            <button className="btn ghost" onClick={this.resetData} title="Clears chart settings and drawings, keeps your demo account">
              Reset chart settings
            </button>
          </div>
        </div>
      </div>
    );
  }
}
