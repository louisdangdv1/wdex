import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import newsHandler from './netlify/functions/news.mjs';

// Serve the Netlify news function locally (dev + preview), so /.netlify/functions/news
// works without the Netlify CLI.
const serveNews = async (req, res) => {
  try {
    const r = await newsHandler(new Request('http://localhost/.netlify/functions/news'));
    res.statusCode = r.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(await r.text());
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e), items: [] }));
  }
};
const localFunctions = {
  name: 'local-netlify-functions',
  configureServer(server) {
    server.middlewares.use('/.netlify/functions/news', serveNews);
  },
  configurePreviewServer(server) {
    server.middlewares.use('/.netlify/functions/news', serveNews);
  },
};

export default defineConfig({
  plugins: [react(), localFunctions],
  server: { port: 5173, open: true },
});
