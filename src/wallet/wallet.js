// =====================================================================
//  Minimal wallet connector (MetaMask first) without external libraries.
//  Uses EIP-6963 discovery so the right wallet is picked when several
//  browser wallets are installed, and falls back to window.ethereum.
// =====================================================================
import { useSyncExternalStore } from 'react';

const CHAINS = {
  1: { name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io' },
  56: { name: 'BNB Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
  137: { name: 'Polygon', symbol: 'POL', explorer: 'https://polygonscan.com' },
  8453: { name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org' },
  42161: { name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io' },
  10: { name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io' },
  11155111: { name: 'Sepolia', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io' },
};
const KEY = 'wpepe.wallet';

const providers = new Map(); // rdns -> { info, provider }
let state = { address: null, chainId: null, balance: null, wallet: null, connecting: false, error: null };
const listeners = new Set();
let active = null;

const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
export const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;
export const useWallet = () => useSyncExternalStore(subscribe, snapshot);

export const chainInfo = (id) => CHAINS[id] || { name: id ? `Chain ${id}` : '—', symbol: 'ETH', explorer: 'https://etherscan.io' };
export const hasWallet = () => providers.size > 0 || Boolean(window.ethereum);
export const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
/** Opens this page inside the MetaMask mobile app browser */
export const metamaskDeepLink = () => `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e) => {
    const { info, provider } = e.detail || {};
    if (info?.rdns && provider) providers.set(info.rdns, { info, provider });
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

function pickProvider() {
  const mm = providers.get('io.metamask') || providers.get('io.metamask.flask');
  if (mm) return { provider: mm.provider, name: mm.info.name, icon: mm.info.icon };
  const first = [...providers.values()][0];
  if (first) return { provider: first.provider, name: first.info.name, icon: first.info.icon };
  if (window.ethereum) {
    const p = window.ethereum.providers?.find((x) => x.isMetaMask) || window.ethereum;
    return { provider: p, name: p.isMetaMask ? 'MetaMask' : 'Browser wallet', icon: null };
  }
  return null;
}

const onAccounts = (accs) => {
  if (!accs?.length) return disconnect();
  set({ address: accs[0] });
  refreshBalance();
};
const onChain = (hex) => {
  set({ chainId: parseInt(hex, 16) });
  refreshBalance();
};

function attach(p) {
  if (active === p.provider) return;
  detach();
  active = p.provider;
  active.on?.('accountsChanged', onAccounts);
  active.on?.('chainChanged', onChain);
}
function detach() {
  active?.removeListener?.('accountsChanged', onAccounts);
  active?.removeListener?.('chainChanged', onChain);
  active = null;
}

export async function refreshBalance() {
  if (!active || !state.address) return;
  try {
    const wei = await active.request({ method: 'eth_getBalance', params: [state.address, 'latest'] });
    set({ balance: Number(BigInt(wei)) / 1e18 });
  } catch {
    set({ balance: null });
  }
}

export async function connect() {
  const p = pickProvider();
  if (!p) {
    set({ error: 'no-wallet' });
    return null;
  }
  set({ connecting: true, error: null });
  try {
    const accs = await p.provider.request({ method: 'eth_requestAccounts' });
    const chain = await p.provider.request({ method: 'eth_chainId' });
    attach(p);
    set({ address: accs[0], chainId: parseInt(chain, 16), wallet: { name: p.name, icon: p.icon }, connecting: false });
    try {
      localStorage.setItem(KEY, '1');
    } catch { /* ignore */ }
    refreshBalance();
    return accs[0];
  } catch (e) {
    set({ connecting: false, error: e?.code === 4001 ? 'rejected' : e?.message || 'failed' });
    return null;
  }
}

export function disconnect() {
  detach();
  set({ address: null, chainId: null, balance: null, wallet: null });
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

/** Reconnect silently if the user connected before (no popup) */
export async function autoConnect() {
  let remembered = false;
  try {
    remembered = localStorage.getItem(KEY) === '1';
  } catch { /* ignore */ }
  if (!remembered) return;
  await new Promise((r) => setTimeout(r, 300)); // let EIP-6963 wallets announce
  const p = pickProvider();
  if (!p) return;
  try {
    const accs = await p.provider.request({ method: 'eth_accounts' });
    if (!accs?.length) return;
    const chain = await p.provider.request({ method: 'eth_chainId' });
    attach(p);
    set({ address: accs[0], chainId: parseInt(chain, 16), wallet: { name: p.name, icon: p.icon } });
    refreshBalance();
  } catch { /* ignore */ }
}

/** personal_sign of a UTF-8 message (free, no gas) */
export async function signText(message) {
  if (!active || !state.address) throw new Error('Connect your wallet first');
  const hex = '0x' + [...new TextEncoder().encode(message)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return active.request({ method: 'personal_sign', params: [hex, state.address] });
}

export const clearError = () => set({ error: null });
