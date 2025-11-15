// Simple client-side partial include loader.
// Looks for elements with attribute data-include="//partials/xxx.html"
document.addEventListener("DOMContentLoaded", function() {
  const includes = document.querySelectorAll('[data-include]');
  includes.forEach(el => {
    const src = el.getAttribute('data-include');
    if (!src) return;
    fetch(src).then(res => {
      if (!res.ok) throw new Error('Failed to fetch ' + src);
      return res.text();
    }).then(html => {
      el.innerHTML = html;
    }).catch(err => {
      console.error('Include load error:', err);
    });
  });
});
