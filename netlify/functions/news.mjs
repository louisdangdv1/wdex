// =====================================================================
//  Netlify Function: aggregates crypto news RSS feeds into one JSON list.
//  Browsers can't read these feeds directly (no CORS), so we fetch them
//  server-side, normalise them and let the CDN cache the result.
//  URL: /.netlify/functions/news
// =====================================================================

const FEEDS = [
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'CryptoSlate', url: 'https://cryptoslate.com/feed/' },
  { source: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/' },
];

const TOPICS = [
  ['Bitcoin', /\b(bitcoin|btc|satoshi|halving|lightning)\b/i],
  ['Ethereum', /\b(ethereum|eth|ether|vitalik|layer[- ]?2|rollup)\b/i],
  ['Altcoins', /\b(solana|sol|xrp|ripple|cardano|ada|dogecoin|doge|bnb|avalanche|avax|chainlink|litecoin|tron|altcoin|memecoin)\b/i],
  ['DeFi', /\b(defi|dex|lending|liquidity|stablecoin|yield|staking|uniswap|aave)\b/i],
  ['Regulation', /\b(sec|regulat\w*|law|court|lawsuit|congress|senate|cftc|policy|ban|tax|government|license)\b/i],
  ['Markets', /\b(price|rally|crash|etf|market|trader?s?|liquidat\w*|bull\w*|bear\w*|funding|futures|inflows?|outflows?)\b/i],
  ['NFT & Web3', /\b(nft|metaverse|gaming|web3|dao)\b/i],
  ['Security', /\b(hack\w*|exploit\w*|scam\w*|stolen|breach|phishing|attack)\b/i],
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
const unCdata = (s) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
const stripTags = (s) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? unCdata(m[1]) : '';
}
function attr(xml, name, attribute) {
  const m = xml.match(new RegExp(`<${name}\\s[^>]*${attribute}=["']([^"']+)["']`, 'i'));
  return m ? decode(m[1]) : '';
}

function parseItem(xml, source) {
  const title = stripTags(tag(xml, 'title'));
  const link = stripTags(tag(xml, 'link')) || attr(xml, 'link', 'href');
  const dateStr = tag(xml, 'pubDate') || tag(xml, 'dc:date') || tag(xml, 'published');
  const time = Date.parse(stripTags(dateStr)) || null;
  const rawDesc = tag(xml, 'description') || tag(xml, 'content:encoded');
  const content = tag(xml, 'content:encoded') || rawDesc;
  let image =
    attr(xml, 'media:content', 'url') ||
    attr(xml, 'media:thumbnail', 'url') ||
    (/<enclosure[^>]*type=["']image/i.test(xml) ? attr(xml, 'enclosure', 'url') : '') ||
    (decode(content).match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
    '';
  if (image && !/^https?:\/\//i.test(image)) image = '';
  let summary = stripTags(rawDesc);
  if (summary.length > 260) summary = summary.slice(0, 257).replace(/\s+\S*$/, '') + '…';
  const categories = [...xml.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => stripTags(unCdata(m[1]))).filter(Boolean);
  const text = `${title} ${summary} ${categories.join(' ')}`;
  const topics = TOPICS.filter(([, re]) => re.test(text)).map(([t]) => t);
  return { id: link || title, title, link, time, summary, image, source, topics: topics.length ? topics : ['General'] };
}

async function fetchFeed({ source, url }) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WPEPENewsBot/1.0 (+https://wdex-841.netlify.app)', Accept: 'application/rss+xml, application/xml, text/xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`${source}: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => parseItem(m[0], source));
}

export async function getNews() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const seen = new Set();
  const items = [];
  const sources = [];
  results.forEach((r, i) => {
    sources.push({ source: FEEDS[i].source, ok: r.status === 'fulfilled', count: r.status === 'fulfilled' ? r.value.length : 0 });
    if (r.status !== 'fulfilled') return;
    for (const it of r.value) {
      const key = (it.link || it.title).toLowerCase();
      if (!it.title || !it.link || !it.time || seen.has(key)) continue;
      seen.add(key);
      items.push(it);
    }
  });
  items.sort((a, b) => b.time - a.time);
  return { updated: Date.now(), sources, items: items.slice(0, 250) };
}

export default async () => {
  try {
    const data = await getNews();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=600',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e), items: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
