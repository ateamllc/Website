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
    const rows = Number(container.dataset.carouselRows || 1);
    const shouldAutoscroll = container.dataset.carouselAutoscroll === 'true';
    const speed = container.dataset.carouselSpeed || '90s';

    const titleEl = root.querySelector('.carousel-title');
    const eyebrowEl = root.querySelector('.carousel-eyebrow');
    if (titleText && titleEl) titleEl.textContent = titleText;
    if (eyebrowText && eyebrowEl) eyebrowEl.textContent = eyebrowText;

    const images = (container.dataset.carouselImages || '')
      .split(',')
      .map((src) => src.trim())
      .filter(Boolean);

    if (!images.length) return;

    root.classList.toggle('is-two-row', rows === 2);
    root.classList.toggle('is-autoscroll', shouldAutoscroll);
    root.style.setProperty('--carousel-duration', speed);

    const displayImages = shouldAutoscroll && rows === 2 && images.length % 2 !== 0
      ? images.concat(images[0])
      : images;

    const createCard = (src, idx, isClone = false) => {
      const card = document.createElement('div');
      card.className = 'carousel-card';
      if (isClone) {
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.setAttribute('role', 'listitem');
      }

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = src;
      img.alt = isClone ? '' : `${label} ${idx + 1}`;

      card.appendChild(img);
      track.appendChild(card);
    };

    track.innerHTML = '';
    displayImages.forEach((src, idx) => createCard(src, idx));
    if (shouldAutoscroll) {
      displayImages.forEach((src, idx) => createCard(src, idx, true));
    }

    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const scrollAmount = () => {
      const sampleCard = root.querySelector('.carousel-card');
      return sampleCard ? sampleCard.getBoundingClientRect().width + 12 : track.clientWidth * 0.6;
    };

    const controls = root.querySelector('.carousel-controls');
    const refreshControls = () => {
      if (shouldAutoscroll) {
        if (controls) controls.classList.add('is-hidden');
        return;
      }

      const scrollable = track.scrollWidth - track.clientWidth > 8;
      if (controls) controls.classList.toggle('is-hidden', !scrollable);
    };

    const scrollBy = (direction) => {
      track.scrollBy({ left: direction * scrollAmount(), behavior: 'smooth' });
    };

    prevBtn && prevBtn.addEventListener('click', () => scrollBy(-1));
    nextBtn && nextBtn.addEventListener('click', () => scrollBy(1));

    refreshControls();
    window.addEventListener('resize', refreshControls);
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = refreshControls;
    });

    container.dataset.carouselInit = 'true';
  };

  const observeCarousels = () => {
    const tryInit = (node) => {
      if (!(node instanceof Element)) return;

      if (node.hasAttribute('data-carousel-images')) {
        initCarousel(node);
      }

      if (node.querySelectorAll) {
        node.querySelectorAll('[data-carousel-images]').forEach((el) => initCarousel(el));
      }
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

  const applyCurrentYear = (root = document) => {
    const year = new Date().getFullYear();
    root.querySelectorAll('[data-current-year], #current-year').forEach((el) => {
      el.textContent = year;
    });
  };

  const observeCurrentYearTargets = () => {
    applyCurrentYear();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches && node.matches('[data-current-year], #current-year')) {
            applyCurrentYear(node.parentElement || node);
          } else {
            const candidates = node.querySelectorAll ? node.querySelectorAll('[data-current-year], #current-year') : [];
            if (candidates.length) {
              candidates.forEach(() => applyCurrentYear(node));
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', () => applyCurrentYear());
  };

  observeCarousels();
  observeCurrentYearTargets();
})();
