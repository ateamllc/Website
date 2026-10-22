const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const excludedFiles = new Set([
  path.join('pages', 'admin-dashboard.html'),
  path.join('pages', 'admin-login.html'),
  path.join('pages', 'admin-users.html'),
  path.join('pages', 'admin-data.html'),
  'door.html',
  path.join('pages', 'door-hanger-offer.html'),
  path.join('pages', 'manual-lead-entry.html'),
  path.join('pages', 'knocking-submitted.html'),
  path.join('pages', 'thank-you.html'),
  path.join('pages', 'property-manager-maintenance-request.html'),
]);

const publicPathAliases = new Map([
  [path.join('pages', 'privacy-policy.html'), '/privacy-policy'],
  [path.join('pages', 'sms-terms.html'), '/sms-terms'],
  [path.join('pages', 'twilio-campaign-privacy-policy.html'), '/twilio-campaign-privacy-policy'],
]);

function readDomain(siteRoot = rootDir) {
  const cnamePath = path.join(siteRoot, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    const domain = fs.readFileSync(cnamePath, 'utf8').split('\n')[0].trim();
    if (domain) return `https://${domain}`;
  }
  return 'https://ateamutah.com';
}

// Inspect real meta tags, ignoring examples in comments and executable/style text.
// Attribute order, quote style, case, and whitespace need not match our templates.
function hasNoindex(html) {
  const markup = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const tags = markup.match(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || [];
  return tags.some((tag) => {
    const attributes = {};
    const pattern = /([^\s=<>\/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    for (const match of tag.matchAll(pattern)) {
      const name = match[1].toLowerCase();
      if (!(name in attributes)) attributes[name] = match[2] ?? match[3] ?? match[4];
    }
    const name = (attributes.name || '').trim().toLowerCase();
    return (name === 'robots' || name === 'googlebot')
      && /(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(attributes.content || '');
  });
}

function collectHtmlFiles(dir, ignoreDirs = new Set(), siteRoot = rootDir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || ignoreDirs.has(entry.name)) continue;
      results.push(...collectHtmlFiles(fullPath, ignoreDirs, siteRoot));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const relativePath = path.relative(siteRoot, fullPath);
      if (excludedFiles.has(relativePath)) continue;
      if (hasNoindex(fs.readFileSync(fullPath, 'utf8'))) continue;
      results.push(fullPath);
    }
  }
  return results;
}

function toUrlPath(filePath, siteRoot = rootDir) {
  const relative = path.relative(siteRoot, filePath).split(path.sep).join('/');
  const alias = publicPathAliases.get(path.relative(siteRoot, filePath));
  if (alias) return alias;
  if (relative === 'index.html') return '';
  if (relative.endsWith('/index.html')) return `/${relative.replace(/\/index\.html$/, '')}`;
  return `/${relative.replace(/\.html$/, '')}`;
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

function main(siteRoot = rootDir) {
  const baseUrl = readDomain(siteRoot).replace(/\/+$/, '');
  // These directories contain source/reference material, not public HTML pages.
  const htmlFiles = collectHtmlFiles(siteRoot, new Set([
    'partials', 'node_modules', 'docs', 'tests', 'scripts', 'githooks',
    'image', 'fonts', 'css', 'js', 'data',
  ]), siteRoot);

  // Stable ordering and aliases keep duplicate file implementations to one URL.
  const urls = new Set();
  const sortedFiles = htmlFiles.sort();
  sortedFiles.forEach((file) => {
    const urlPath = toUrlPath(file, siteRoot);
    const loc = urlPath ? `${baseUrl}${urlPath}` : `${baseUrl}/`;
    urls.add(loc);
  });

  const xml = buildSitemapXml(Array.from(urls));
  const outputPath = path.join(siteRoot, 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Wrote sitemap with ${urls.size} URLs to ${outputPath}`);
}

if (require.main === module) main();

module.exports = { hasNoindex, main };
