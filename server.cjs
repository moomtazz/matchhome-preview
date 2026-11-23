const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Only prototype assets are public; original documents stay private.
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'finance.js', 'data.js', 'assets/hero.jpg', 'assets/house-1.jpg', 'assets/house-2.jpg', 'assets/house-3.jpg', 'assets/apartment.jpg', 'assets/manrope-regular.ttf', 'assets/manrope-bold.ttf', 'assets/Manrope-LICENSE.txt']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  if (!publicFiles.has(file)) { res.writeHead(404).end('Not found'); return; }
  fs.readFile(path.join(__dirname, file), (error, content) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});
server.listen(4187, '127.0.0.1', () => console.log('MatchHome siap di http://127.0.0.1:4187'));
