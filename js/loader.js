// Simple client-side partial include loader.
<<<<<<< HEAD
// Looks for elements with attribute data-include="//partials/xxx.html"
=======
// Looks for elements with attribute data-include="partials/xxx.html"
>>>>>>> f9a338427e217f97383c2e860726afe3cb1281e5
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
