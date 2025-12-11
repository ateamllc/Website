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

  const initCarousel = (container) => {
    if (!container || container.dataset.carouselInit === 'true') return;

    const root = container.querySelector('[data-carousel-root]');
    const track = root ? root.querySelector('.carousel-track') : null;
    if (!root || !track) return;

    const titleText = container.dataset.carouselTitle;
    const eyebrowText = container.dataset.carouselEyebrow;
    const label = container.dataset.carouselLabel || 'Project photo';

    const titleEl = root.querySelector('.carousel-title');
    const eyebrowEl = root.querySelector('.carousel-eyebrow');
    if (titleText && titleEl) titleEl.textContent = titleText;
    if (eyebrowText && eyebrowEl) eyebrowEl.textContent = eyebrowText;

    const images = (container.dataset.carouselImages || '')
      .split(',')
      .map((src) => src.trim())
      .filter(Boolean);

    if (!images.length) return;

    track.innerHTML = '';
    images.forEach((src, idx) => {
      const card = document.createElement('div');
      card.className = 'carousel-card';
      card.setAttribute('role', 'listitem');

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = src;
      img.alt = `${label} ${idx + 1}`;

      card.appendChild(img);
      track.appendChild(card);
    });

    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const scrollAmount = () => {
      const sampleCard = root.querySelector('.carousel-card');
      return sampleCard ? sampleCard.getBoundingClientRect().width + 12 : track.clientWidth * 0.6;
    };

    const scrollBy = (direction) => {
      track.scrollBy({ left: direction * scrollAmount(), behavior: 'smooth' });
    };

    prevBtn && prevBtn.addEventListener('click', () => scrollBy(-1));
    nextBtn && nextBtn.addEventListener('click', () => scrollBy(1));

    container.dataset.carouselInit = 'true';
  };

  const observeCarousels = () => {
    const tryInit = (node) => {
      if (!(node instanceof Element)) return;

      if (node.hasAttribute('data-carousel-images')) {
        initCarousel(node);
      }

      node.querySelectorAll?.('[data-carousel-images]').forEach((el) => initCarousel(el));
    };

    tryInit(document.body);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => tryInit(node));
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', () => {
      document.querySelectorAll('[data-carousel-images]').forEach((el) => initCarousel(el));
    });
  };

  observeCarousels();
})();
