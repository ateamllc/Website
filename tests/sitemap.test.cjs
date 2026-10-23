const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { hasNoindex, main } = require('../scripts/generate-sitemap.js');

test('robots exclusions survive case, attribute order, multiple tags and directives', () => {
  const excluded = [
    '<META CONTENT="index, NOINDEX, follow" NAME="RoBoTs">',
    "<meta name='robots' content=' index,\n noindex , follow '>",
    '<meta name=robots content=noindex>',
    '<meta name="robots" content="index"><meta content="noindex,nofollow" name="robots">',
    '<meta name="robots" content="none">',
    '<meta name="googlebot" content="noindex, follow">',
    '<meta data-note="a > b" content="NOINDEX"\n name = "robots" />',
  ];
  for (const html of excluded) assert.equal(hasNoindex(html), true, html);
  const publicPages = [
    '<meta name="robots" content="index,follow">',
    '<meta name="robots" content="noimageindex,nofollow">',
    '<meta name="description" content="noindex">',
    '<!-- <meta name="robots" content="noindex"> -->',
    '<script>const example = \'<meta name="robots" content="noindex">\';</script>',
    '<h1>No robots directive</h1>',
  ];
  for (const html of publicPages) assert.equal(hasNoindex(html), false, html);
});

test('generation excludes utilities, future noindex pages and non-public HTML', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ateam-sitemap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, content) => {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write('CNAME', 'ateamutah.com\n');
  write('index.html', '<h1>Home</h1>');
  write('pages/landing/handyman.html', '<h1>Handyman</h1>');
  write('pages/thank-you.html', '<h1>Utility without a directive</h1>');
  write('pages/property-manager-maintenance-request.html', '<h1>Utility</h1>');
  write('pages/future-utility.html', '<META CONTENT="follow, NOINDEX" NAME="ROBOTS">');
  write('pages/admin-login.html', '<h1>Internal</h1>');
  write('pages/partials/nav.html', '<nav>Shared</nav>');
  write('docs/reference/example.html', '<h1>Reference</h1>');
  write('tests/fixture.html', '<h1>Fixture</h1>');
  write('.git/example.html', '<h1>Hidden</h1>');
  write('pages/privacy-policy.html', '<h1>Privacy</h1>');
  write('privacy-policy/index.html', '<h1>Privacy</h1>');
  main(root);
  const first = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...first.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, [
    'https://ateamutah.com/',
    'https://ateamutah.com/pages/landing/handyman',
    'https://ateamutah.com/privacy-policy',
  ]);
  assert.match(first, /<loc>https:\/\/ateamutah\.com\/pages\/landing\/handyman<\/loc>\s*<lastmod>2026-10-22<\/lastmod>/);
  assert.match(first, /<loc>https:\/\/ateamutah\.com\/privacy-policy<\/loc>\s*<\/url>/);
  main(root);
  assert.equal(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), first);
});

test('real utility directives and generated sitemap agree', () => {
  const root = path.resolve(__dirname, '..');
  for (const name of ['thank-you', 'property-manager-maintenance-request']) {
    assert.equal(hasNoindex(fs.readFileSync(path.join(root, 'pages', `${name}.html`), 'utf8')), true, name);
  }
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, new Set(urls).size);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://ateamutah.com');
    assert.doesNotMatch(parsed.pathname, /\.html$|\/partials\/|thank-you|property-manager-maintenance-request/);
    const candidates = parsed.pathname === '/' ? ['index.html']
      : [`${parsed.pathname.slice(1)}.html`, `${parsed.pathname.slice(1)}/index.html`];
    const file = candidates.map(name => path.join(root, name)).find(name => fs.existsSync(name));
    assert.ok(file, `No source for ${url}`);
    assert.equal(hasNoindex(fs.readFileSync(file, 'utf8')), false, url);
  }
});
