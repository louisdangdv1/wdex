// =====================================================================
//  Airdrop allowlist configuration (shared by the website and the
//  Netlify Function). Edit the values here to run your own campaign.
// =====================================================================

/** Official links. Leave empty until the channel exists: the task shows "soon". */
export const SOCIAL = {
  x: '', // e.g. 'https://x.com/wpepe'
  telegram: 'https://t.me/pepewcoin',
  post: '', // e.g. the launch post to repost
};

export const AIRDROP = {
  /** When the allowlist closes (UTC) */
  end: '2026-12-31T23:59:59Z',
  /** Community goal shown on the progress bar */
  goal: 10000,
  /** Points granted for simply registering a wallet */
  base: 1000,
  /** Points for the referrer per friend, and a welcome bonus for the friend */
  refBonus: 250,
  refWelcome: 200,
  /** Estimated $WPEPE per point (display only, not a promise) */
  tokensPerPoint: 1_000_000,
  /** Hours between two Lily Wheel spins */
  spinHours: 20,
  /** Lily Wheel prizes (points) and their weights */
  spin: [
    [50, 30],
    [100, 26],
    [150, 18],
    [250, 12],
    [420, 8],
    [690, 4],
    [1000, 2],
  ],
};

export const TASKS = [
  { id: 'x', label: 'Follow WPEPE on X', points: 500, link: SOCIAL.x },
  { id: 'tg', label: 'Join the WPEPE Telegram', points: 500, link: SOCIAL.telegram },
  { id: 'rt', label: 'Repost the launch post on X', points: 300, link: SOCIAL.post },
  { id: 'trade', label: 'Make 3 trades on the Swamp Exchange (demo)', points: 700, local: 'trade' },
  { id: 'meme', label: 'Download a meme from Meme Maker 3000', points: 300, local: 'meme' },
];

/** [min points, name, icon, multiplier] */
export const TIERS = [
  [0, 'Tadpole', '🥚', 1],
  [2000, 'Froglet', '🐣', 1.1],
  [3000, 'Frog', '🐸', 1.25],
  [4500, 'Swamp Lord', '👑', 1.5],
  [7000, 'Moon Frog', '🌕', 2],
];

export function tierOf(points) {
  let t = TIERS[0];
  for (const x of TIERS) if (points >= x[0]) t = x;
  const next = TIERS[TIERS.indexOf(t) + 1] || null;
  return { min: t[0], name: t[1], icon: t[2], mult: t[3], next: next && { min: next[0], name: next[1], icon: next[2] } };
}

export function computePoints(rec) {
  const tasks = TASKS.filter((t) => rec.tasks?.includes(t.id)).reduce((s, t) => s + t.points, 0);
  return AIRDROP.base + tasks + (rec.ref ? AIRDROP.refWelcome : 0) + (rec.referrals || 0) * AIRDROP.refBonus + (rec.spinBonus || 0);
}

export const estTokens = (points) => Math.round(points * tierOf(points).mult * AIRDROP.tokensPerPoint);

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

/** The exact text a wallet signs to join (free, no gas) */
export const signMessage = (address, issued) =>
  `WPEPE Airdrop Allowlist\n\nI confirm I own this wallet and want to join the WPEPE allowlist.\nThis signature is free and does not move any funds.\n\nWallet: ${address}\nIssued: ${issued}`;
