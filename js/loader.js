// Simple client-side partial include loader.
// Looks for elements with attribute data-include="partials/xxx.html"
document.addEventListener("DOMContentLoaded", function() {
  // Apache honors the extensionless URLs used throughout the public site. Most
  // lightweight local servers do not, so make those same links usable during
  // local development without changing the production-facing URLs.
  const normalizeLocalPageLinks = (scope = document) => {
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (!isLocalHost) return;

    scope.querySelectorAll('a[href^="/pages/"]').forEach(link => {
      const url = new URL(link.href, window.location.origin);
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment && !lastSegment.includes('.')) {
        url.pathname += '.html';
        link.href = url.pathname + url.search + url.hash;
      }
    });
  };

  normalizeLocalPageLinks();
  if (/\/pages\/free-(wood-fence|chain-link-fence|interior-paint|exterior-paint)-estimate(?:\.html)?$/.test(window.location.pathname)) {
    const estimateScript = document.createElement('script');
    estimateScript.src = '/js/public-estimates.js?v=20260726-turnstile';
    estimateScript.defer = true;
    document.head.appendChild(estimateScript);
  }
  if (/\/pages\/instant-quote(?:\.html)?$/.test(window.location.pathname)) {
    const genericEstimateScript = document.createElement('script');
    genericEstimateScript.src = '/js/instant-estimate-fields.js?v=20260726-turnstile';
    genericEstimateScript.defer = true;
    document.head.appendChild(genericEstimateScript);
  }
  const includes = document.querySelectorAll('[data-include]');

  const isAbsoluteUrl = url => /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('/');

  const buildCandidateUrls = (src) => {
    if (!src) return [];

    if (isAbsoluteUrl(src)) {
      return [src];
    }

    const candidates = [];
    const origin = window.location.origin;
    const relativeHref = new URL(src, document.baseURI).href;
    candidates.push(relativeHref);

    const cleanedSrc = src.replace(/^\.\//, '');
    const pathname = window.location.pathname;
    const directoryPath = pathname.endsWith('/')
      ? pathname
      : pathname.substring(0, pathname.lastIndexOf('/') + 1);
    const segments = directoryPath.split('/').filter(Boolean);

    for (let i = segments.length; i >= 0; i--) {
      const prefix = i === 0 ? '/' : '/' + segments.slice(0, i).join('/') + '/';
      const candidateUrl = new URL(prefix + cleanedSrc, origin).href;
      if (!candidates.includes(candidateUrl)) {
        candidates.push(candidateUrl);
      }
    }

    return candidates;
  };

  includes.forEach(el => {
    const src = el.getAttribute('data-include');
    if (!src) return;

    const candidates = buildCandidateUrls(src);

    const tryNext = (index = 0) => {
      if (index >= candidates.length) {
        console.error('Include load error: unable to fetch', src);
        return;
      }

      fetch(candidates[index]).then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch ' + candidates[index] + ' (' + res.status + ')');
        }
        return res.text();
      }).then(html => {
        el.innerHTML = html;
        normalizeLocalPageLinks(el);
      }).catch(() => {
        tryNext(index + 1);
      });
    };

    tryNext();
  });
});
