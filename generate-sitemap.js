const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const pagesDir = path.join(rootDir, 'pages');

function readDomain() {
  const cnamePath = path.join(rootDir, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    const domain = fs.readFileSync(cnamePath, 'utf8').split('\n')[0].trim();
    if (domain) return `https://${domain}`;
  }
  return 'https://a-team-handyman-services.com';
}

function collectHtmlFiles(dir, ignoreDirs = new Set()) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      results.push(...collectHtmlFiles(fullPath, ignoreDirs));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function toUrlPath(filePath) {
  const relative = path.relative(rootDir, filePath).split(path.sep).join('/');
  if (relative === 'index.html') return '';
  return `/${relative}`;
}

function buildSitemapXml(urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  urls.forEach((loc) => {
    lines.push('  <url>');
    lines.push(`    <loc>${loc}</loc>`);
    lines.push('  </url>');
  });
  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

function main() {
  const baseUrl = readDomain().replace(/\/+$/, '');
  const htmlFiles = collectHtmlFiles(rootDir, new Set(['partials'])).filter((file) => {
    // exclude files inside pages/partials
    const rel = path.relative(rootDir, file);
    return !rel.startsWith(`pages${path.sep}partials${path.sep}`);
  });

  // Ensure index.html is first
  const urls = new Set();
  const sortedFiles = htmlFiles.sort();
  sortedFiles.forEach((file) => {
    const urlPath = toUrlPath(file);
    const loc = urlPath ? `${baseUrl}${urlPath}` : `${baseUrl}/`;
    urls.add(loc);
  });

  const xml = buildSitemapXml(Array.from(urls));
  const outputPath = path.join(rootDir, 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Wrote sitemap with ${urls.size} URLs to ${outputPath}`);
}

main();
