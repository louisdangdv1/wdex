// =====================================================================
//  Netlify Function: WPEPE airdrop allowlist
//   GET  ?stats=1                -> count, recent joins, referral leaderboard
//   GET  ?address=0x..           -> a wallet's registration (public fields)
//   GET  ?export=csv&key=ADMIN   -> all registrations as CSV (owner only)
//   POST {action:'register', ...} -> join / update (requires a wallet signature)
//   POST {action:'spin', address} -> daily Lily Wheel spin
//  Data lives in Netlify Blobs (store "wpepe-airdrop").
// =====================================================================
import { getStore } from '@netlify/blobs';
import { getAddress, verifyMessage } from 'viem';
import { AIRDROP, TASKS, computePoints, estTokens, tierOf, shortAddr } from '../../src/airdrop/config.js';

// ---------- storage (Netlify Blobs, or memory when running locally) ----------
const mem = new Map();
const memStore = {
  async get(k) {
    return mem.has(k) ? JSON.parse(mem.get(k)) : null;
  },
  async setJSON(k, v) {
    mem.set(k, JSON.stringify(v));
  },
  async list({ prefix }) {
    return { blobs: [...mem.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
  },
};
function openStore() {
  try {
    return getStore({ name: 'wpepe-airdrop', consistency: 'strong' });
  } catch {
    return memStore; // local dev without Netlify environment
  }
}
const getJSON = (s, k) => (s === memStore ? s.get(k) : s.get(k, { type: 'json' }));

// ---------- helpers ----------
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const clean = (s, max) => String(s ?? '').trim().slice(0, max);
const HANDLE = /^@?[A-Za-z0-9_]{2,32}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;

function publicRecord(r) {
  const points = computePoints(r);
  const tier = tierOf(points);
  return {
    address: r.address,
    code: r.code,
    x: r.x,
    tasks: r.tasks,
    referrals: r.referrals || 0,
    spinBonus: r.spinBonus || 0,
    points,
    tier,
    tokens: estTokens(points),
    created: r.created,
    nextSpin: (r.lastSpin || 0) + AIRDROP.spinHours * 3600_000,
  };
}

async function loadIndex(s) {
  return (await getJSON(s, 'index')) || { recent: [], refs: {} };
}

async function stats(s) {
  const [{ blobs }, idx] = await Promise.all([s.list({ prefix: 'w:' }), loadIndex(s)]);
  const top = Object.entries(idx.refs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([a, n]) => ({ addr: shortAddr(a), referrals: n }));
  return { count: blobs.length, goal: AIRDROP.goal, end: AIRDROP.end, recent: idx.recent.slice(0, 15), top };
}

function codeFor(address, len = 6) {
  return 'FROG' + address.slice(2, 2 + len).toUpperCase();
}

async function register(s, body) {
  if (Date.now() > Date.parse(AIRDROP.end)) return json({ error: 'The allowlist is closed.' }, 400);
  let address;
  try {
    address = getAddress(String(body.address || ''));
  } catch {
    return json({ error: 'Invalid wallet address.' }, 400);
  }
  const message = String(body.message || '');
  const signature = String(body.signature || '');
  if (!message.toLowerCase().includes(`wallet: ${address.toLowerCase()}`)) return json({ error: 'Signed message does not match the wallet.' }, 400);
  const issued = Date.parse((message.match(/Issued: (.+)$/m) || [])[1]);
  if (!issued || Math.abs(Date.now() - issued) > 15 * 60_000) return json({ error: 'Signature expired. Please sign again.' }, 400);
  let valid = false;
  try {
    valid = await verifyMessage({ address, message, signature });
  } catch {
    valid = false;
  }
  if (!valid) return json({ error: 'Invalid signature.' }, 401);

  const x = clean(body.x, 33).replace(/^@/, '');
  const tg = clean(body.tg, 33).replace(/^@/, '');
  const email = clean(body.email, 254);
  if (!HANDLE.test(x)) return json({ error: 'Please enter a valid X (Twitter) handle.' }, 400);
  if (tg && !HANDLE.test(tg)) return json({ error: 'Telegram handle looks invalid.' }, 400);
  if (email && !EMAIL.test(email)) return json({ error: 'Email looks invalid.' }, 400);
  const taskIds = new Set(TASKS.map((t) => t.id));
  const tasks = [...new Set((Array.isArray(body.tasks) ? body.tasks : []).filter((t) => taskIds.has(t)))];

  const key = `w:${address.toLowerCase()}`;
  const existing = await getJSON(s, key);
  const now = Date.now();
  let rec;
  if (existing) {
    rec = { ...existing, x, tg, email, tasks: [...new Set([...(existing.tasks || []), ...tasks])], updated: now };
  } else {
    // unique referral code
    let code = codeFor(address);
    const owner = await getJSON(s, `r:${code}`);
    if (owner && owner.address !== address) code = codeFor(address, 10);
    rec = { address, code, x, tg, email, tasks, ref: null, referrals: 0, spinBonus: 0, lastSpin: 0, created: now, updated: now };

    // referral
    const ref = clean(body.ref, 20).toUpperCase();
    if (/^FROG[0-9A-F]{6,10}$/.test(ref) && ref !== code) {
      const r = await getJSON(s, `r:${ref}`);
      if (r && r.address !== address) {
        const refKey = `w:${r.address.toLowerCase()}`;
        const referrer = await getJSON(s, refKey);
        if (referrer) {
          referrer.referrals = (referrer.referrals || 0) + 1;
          await s.setJSON(refKey, referrer);
          rec.ref = ref;
          const idx = await loadIndex(s);
          idx.refs[referrer.address] = referrer.referrals;
          await s.setJSON('index', idx);
        }
      }
    }
    await s.setJSON(`r:${code}`, { address });
  }
  await s.setJSON(key, rec);

  if (!existing) {
    const idx = await loadIndex(s);
    idx.recent = [{ addr: shortAddr(address), t: now }, ...idx.recent].slice(0, 30);
    await s.setJSON('index', idx);
  }
  return json({ ok: true, created: !existing, record: publicRecord(rec) });
}

async function spin(s, body) {
  let address;
  try {
    address = getAddress(String(body.address || ''));
  } catch {
    return json({ error: 'Invalid wallet address.' }, 400);
  }
  const key = `w:${address.toLowerCase()}`;
  const rec = await getJSON(s, key);
  if (!rec) return json({ error: 'Join the allowlist first.' }, 400);
  const wait = (rec.lastSpin || 0) + AIRDROP.spinHours * 3600_000 - Date.now();
  if (wait > 0) return json({ error: `Next spin in ${Math.ceil(wait / 3600_000)}h.`, record: publicRecord(rec) }, 429);
  const total = AIRDROP.spin.reduce((s2, [, w]) => s2 + w, 0);
  let roll = Math.random() * total;
  let prize = AIRDROP.spin[0][0];
  for (const [p, w] of AIRDROP.spin) {
    roll -= w;
    if (roll <= 0) {
      prize = p;
      break;
    }
  }
  rec.spinBonus = (rec.spinBonus || 0) + prize;
  rec.lastSpin = Date.now();
  await s.setJSON(key, rec);
  return json({ ok: true, prize, record: publicRecord(rec) });
}

async function exportCsv(s, key) {
  const admin = (globalThis.Netlify?.env?.get?.('AIRDROP_ADMIN_KEY')) || process.env.AIRDROP_ADMIN_KEY;
  if (!admin || key !== admin) return json({ error: 'Forbidden' }, 403);
  const { blobs } = await s.list({ prefix: 'w:' });
  const rows = [['address', 'x', 'telegram', 'email', 'tasks', 'referral_code', 'referred_by', 'referrals', 'points', 'est_tokens', 'created']];
  for (const b of blobs) {
    const r = await getJSON(s, b.key);
    if (!r) continue;
    const p = computePoints(r);
    rows.push([r.address, r.x, r.tg, r.email, (r.tasks || []).join('|'), r.code, r.ref || '', r.referrals || 0, p, estTokens(p), new Date(r.created).toISOString()]);
  }
  const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="wpepe-allowlist.csv"', 'Cache-Control': 'no-store' } });
}

export default async (req) => {
  const s = openStore();
  const url = new URL(req.url);
  try {
    if (req.method === 'GET') {
      if (url.searchParams.get('export') === 'csv') return exportCsv(s, url.searchParams.get('key'));
      if (url.searchParams.get('address')) {
        let address;
        try {
          address = getAddress(url.searchParams.get('address'));
        } catch {
          return json({ error: 'Invalid wallet address.' }, 400);
        }
        const rec = await getJSON(s, `w:${address.toLowerCase()}`);
        return json({ record: rec ? publicRecord(rec) : null });
      }
      return json(await stats(s), 200, { 'Cache-Control': 'public, max-age=15' });
    }
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.action === 'register') return register(s, body);
      if (body.action === 'spin') return spin(s, body);
      return json({ error: 'Unknown action' }, 400);
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (e) {
    return json({ error: 'Server error', detail: String(e?.message || e).slice(0, 200) }, 500);
  }
};
