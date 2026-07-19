import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionSource = fs.readFileSync(path.join(repoRoot, 'js', 'scripts.js'), 'utf8');
const marker = '  const toggleNavigation =';
const attributionSource = `${productionSource.slice(0, productionSource.indexOf(marker))}\n})();`;

class MemoryStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

class BlockedStorage {
  getItem() { throw new Error('Storage unavailable'); }
  setItem() { throw new Error('Storage unavailable'); }
}

class FakeElement {
  querySelectorAll() { return []; }
}

class FakeForm extends FakeElement {
  constructor(fields = {}) {
    super();
    this.fields = new Map(Object.entries(fields).map(([name, value]) => [name, { name, value }]));
  }

  querySelector(selector) {
    const name = /input\[name="([^"]+)"\]/.exec(selector)?.[1];
    return name ? this.fields.get(name) || null : null;
  }

  appendChild(field) { this.fields.set(field.name, field); }
  value(name) { return this.fields.get(name)?.value || ''; }
}

function runAttributionPage(url, options = {}) {
  const forms = options.forms || [];
  const observers = [];
  const cookieJar = options.cookieJar || { value: '' };
  const document = {
    readyState: 'complete',
    documentElement: new FakeElement(),
    querySelectorAll(selector) { return selector === 'form' ? forms : []; },
    createElement() { return { type: '', name: '', value: '' }; },
    addEventListener() {},
    get cookie() { return cookieJar.value; },
    set cookie(value) { cookieJar.value = String(value).split(';')[0]; }
  };
  class FakeMutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
  }
  const location = new URL(url);
  const window = {
    location,
    localStorage: options.localStorage || new MemoryStorage(),
    sessionStorage: options.sessionStorage || new MemoryStorage()
  };
  const context = {
    window,
    document,
    location,
    URL,
    URLSearchParams,
    Date,
    JSON,
    Object,
    Element: FakeElement,
    HTMLFormElement: FakeForm,
    MutationObserver: FakeMutationObserver,
    encodeURIComponent,
    decodeURIComponent
  };
  vm.runInNewContext(attributionSource, context, { filename: 'js/scripts.js' });
  return { window, forms, observers, cookieJar };
}

test('captures click IDs, UTMs, landing page, and timestamp into every form', () => {
  const form = new FakeForm();
  const page = runAttributionPage('https://ateamutah.com/pages/landing/fences?gclid=first-click&utm_source=google&utm_medium=cpc', { forms: [form] });

  assert.equal(form.value('gclid'), 'first-click');
  assert.equal(form.value('utm_source'), 'google');
  assert.equal(form.value('utm_medium'), 'cpc');
  assert.match(form.value('landing_page'), /gclid=first-click/);
  assert.match(form.value('first_touch_at'), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(page.window.ATeamAttribution.getFirstTouch().gclid, 'first-click');
});

test('keeps the original first touch when a later campaign visit arrives', () => {
  const localStorage = new MemoryStorage();
  const first = new FakeForm();
  const firstPage = runAttributionPage('https://ateamutah.com/?gclid=original&utm_campaign=fences', { forms: [first], localStorage });
  const originalTimestamp = first.value('first_touch_at');
  const second = new FakeForm();
  runAttributionPage('https://ateamutah.com/pages/contact?gclid=replacement&utm_campaign=painting', { forms: [second], localStorage, cookieJar: firstPage.cookieJar });

  assert.equal(second.value('gclid'), 'original');
  assert.equal(second.value('utm_campaign'), 'fences');
  assert.equal(second.value('first_touch_at'), originalTimestamp);
  assert.match(second.value('landing_page'), /gclid=original/);
});

test('uses the first-party cookie when local storage is unavailable', () => {
  const cookieJar = { value: '' };
  const first = new FakeForm();
  runAttributionPage('https://ateamutah.com/?wbraid=cookie-click', { forms: [first], localStorage: new BlockedStorage(), cookieJar });
  const later = new FakeForm();
  runAttributionPage('https://ateamutah.com/pages/contact?wbraid=later-click', { forms: [later], localStorage: new BlockedStorage(), cookieJar });

  assert.equal(later.value('wbraid'), 'cookie-click');
});

test('populates forms inserted later without overwriting an explicit field value', () => {
  const page = runAttributionPage('https://ateamutah.com/?gbraid=dynamic-click');
  const dynamic = new FakeForm({ utm_source: 'explicit-source' });
  page.observers[0].callback([{ addedNodes: [dynamic] }]);

  assert.equal(dynamic.value('gbraid'), 'dynamic-click');
  assert.equal(dynamic.value('utm_source'), 'explicit-source');
  assert.match(dynamic.value('first_touch_at'), /^\d{4}-/);
});
