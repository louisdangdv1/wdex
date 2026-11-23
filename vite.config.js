import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import newsHandler from './netlify/functions/news.mjs';
import airdropHandler from './netlify/functions/airdrop.mjs';

// Serve the Netlify functions locally (dev + preview) so /.netlify/functions/*
// works without the Netlify CLI. Airdrop data is kept in memory locally.
const FUNCTIONS = { news: newsHandler, airdrop: airdropHandler };

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });

async function serve(req, res, next) {
  const m = req.url.match(/^\/\.netlify\/functions\/([a-z]+)/);
  if (!m || !FUNCTIONS[m[1]]) return next();
  try {
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    const request = new Request(`http://localhost${req.url}`, { method: req.method, headers: { 'content-type': 'application/json' }, body });
    const r = await FUNCTIONS[m[1]](request);
    res.statusCode = r.status;
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(await r.text());
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e) }));
  }
}

const localFunctions = {
  name: 'local-netlify-functions',
  configureServer(server) {
    server.middlewares.use(serve);
  },
  configurePreviewServer(server) {
    server.middlewares.use(serve);
  },
};

export default defineConfig({
  plugins: [react(), localFunctions],
  server: { port: 5173, open: true },
});
