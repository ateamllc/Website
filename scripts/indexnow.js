// Submit URLs to IndexNow (Bing, Yandex, Seznam, Naver, ...). Run AFTER the deploy is live.
// Usage: node scripts/indexnow.js            -> submits every URL in public/sitemap.xml
//        node scripts/indexnow.js URL [URL]  -> submits only the given URLs
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pub = fs.existsSync(path.join(root, 'public')) ? path.join(root, 'public') : root;
const keyFile = fs.readdirSync(pub).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No IndexNow key file (<32 hex>.txt) found');
const key = keyFile.replace('.txt', '');
const sitemap = fs.readFileSync(path.join(pub, 'sitemap.xml'), 'utf8');
const all = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const host = new URL(all[0]).host;
const urls = process.argv.slice(2).length ? process.argv.slice(2) : all;
(async () => {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList: urls })
  });
  console.log(host, urls.length + ' URLs ->', res.status, res.statusText);
  process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
})();
