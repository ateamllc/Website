// Basic scripts for small enhancements
(function() {
  const toggleNavigation = (toggleEl) => {
    if (!toggleEl) return;

    const navMenu = toggleEl.closest('.navigation-menu');
    const navList = navMenu ? navMenu.querySelector('.nav-list') : document.querySelector('#primary-navigation');
    if (!navList) return;

    const isOpen = !navList.classList.contains('open');
    navList.classList.toggle('open', isOpen);
    toggleEl.classList.toggle('is-active', isOpen);
    toggleEl.setAttribute('aria-expanded', String(isOpen));
  };

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('.nav-toggle');
    if (!toggle) return;
    event.preventDefault();
    toggleNavigation(toggle);
  });

  document.addEventListener('click', (event) => {
    const navLink = event.target.closest('.nav-list a');
    if (!navLink) return;

    const navMenu = navLink.closest('.navigation-menu');
    const toggle = navMenu ? navMenu.querySelector('.nav-toggle') : document.querySelector('.nav-toggle');
    const navList = navMenu ? navMenu.querySelector('.nav-list') : document.querySelector('#primary-navigation');

    if (toggle && navList && window.matchMedia('(max-width: 900px)').matches) {
      navList.classList.remove('open');
      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();
