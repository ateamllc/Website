const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { flattenCss } = require('../scripts/generate-main-css');

test('nested imports retain cascade order and original asset destinations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ateam-css-'));
  try {
    fs.mkdirSync(path.join(root, 'css/partials'), { recursive: true });
    fs.writeFileSync(path.join(root, 'css/main.css'), '@import url("partials/nav.css");\n.main{color:blue}');
    fs.writeFileSync(path.join(root, 'css/partials/nav.css'), '.nav{color:red;background:url("../../image/nav.webp?v=1#x")}\n.logo{background:url("/image/logo.webp")}');
    const css = flattenCss(path.join(root, 'css/main.css'), root);
    assert.ok(css.indexOf('color:red') < css.indexOf('color:blue'));
    assert.ok(css.includes('url("/image/nav.webp?v=1#x")'));
    assert.ok(css.includes('url("/image/logo.webp")'));
    assert.ok(!css.includes('@import'));
    fs.writeFileSync(path.join(root, 'css/partials/nav.css'), '@import url("../main.css");');
    assert.throws(() => flattenCss(path.join(root, 'css/main.css'), root), /Circular CSS import/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
