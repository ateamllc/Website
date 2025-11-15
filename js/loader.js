// Simple client-side partial include loader.
// Looks for elements with attribute data-include="partials/xxx.html"
document.addEventListener("DOMContentLoaded", function() {
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
      }).catch(() => {
        tryNext(index + 1);
      });
    };

    tryNext();
  });
});
