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

  const carouselSelector = '[data-carousel-images], [data-carousel-folder]';

  const getInlineCarouselImages = (container) => (
    (container.dataset.carouselImages || '')
      .split(',')
      .map((src) => src.trim())
      .filter(Boolean)
      .map((src) => ({ src, tags: [] }))
  );

  const normalizeCarouselEntry = (entry, folder) => {
    const isObject = entry && typeof entry === 'object' && !Array.isArray(entry);
    const rawSrc = isObject ? entry.src : entry;
    const src = String(rawSrc || '').trim();
    if (!src) return null;

    const tags = isObject && Array.isArray(entry.tags)
      ? entry.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];
    const resolvedSrc = src.startsWith('/') || /^https?:\/\//i.test(src) ? src : `${folder}/${src}`;

    return { src: resolvedSrc, tags };
  };

  const arrangeCarouselEntries = (entries, tag, interval) => {
    if (!tag || !interval || interval < 2) return entries;

    const tagged = entries.filter((entry) => entry.tags.includes(tag));
    const untagged = entries.filter((entry) => !entry.tags.includes(tag));
    if (!tagged.length || !untagged.length) return entries;

    const arranged = [];
    let taggedIndex = 0;
    let untaggedIndex = 0;

    while (taggedIndex < tagged.length || untaggedIndex < untagged.length) {
      const group = [];

      if (taggedIndex < tagged.length) {
        group.push(tagged[taggedIndex]);
        taggedIndex += 1;
      }

      while (group.length < interval && untaggedIndex < untagged.length) {
        group.push(untagged[untaggedIndex]);
        untaggedIndex += 1;
      }

      while (group.length < interval && taggedIndex < tagged.length) {
        group.push(tagged[taggedIndex]);
        taggedIndex += 1;
      }

      arranged.push(...group);
    }

    return arranged;
  };

  const resolveCarouselImages = async (container) => {
    const inlineImages = getInlineCarouselImages(container);
    const folder = (container.dataset.carouselFolder || '').replace(/\/$/, '');
    if (!folder) return inlineImages;

    try {
      const response = await fetch(`${folder}/manifest.json`);
      if (!response.ok) throw new Error(`Carousel manifest returned ${response.status}`);

      const manifest = await response.json();
      const entries = Array.isArray(manifest) ? manifest : manifest.images;
      if (!Array.isArray(entries)) throw new Error('Carousel manifest must be an array or include an images array');

      return entries
        .map((entry) => normalizeCarouselEntry(entry, folder))
        .filter(Boolean);
    } catch (error) {
      console.warn(`Could not load carousel images from ${folder}/manifest.json`, error);
      return inlineImages;
    }
  };

  const initCarousel = async (container) => {
    if (!container || container.dataset.carouselInit === 'true' || container.dataset.carouselInit === 'loading') return;

    const root = container.querySelector('[data-carousel-root]');
    const track = root ? root.querySelector('.carousel-track') : null;
    if (!root || !track) return;

    container.dataset.carouselInit = 'loading';

    const titleText = container.dataset.carouselTitle;
    const eyebrowText = container.dataset.carouselEyebrow;
    const label = container.dataset.carouselLabel || 'Project photo';
    const rows = Number(container.dataset.carouselRows || 1);
    const shouldAutoscroll = container.dataset.carouselAutoscroll === 'true';
    const speed = container.dataset.carouselSpeed || '90s';
    const featuredTag = container.dataset.carouselFeaturedTag || '';
    const featuredEvery = Number(container.dataset.carouselFeaturedEvery || 0);

    const titleEl = root.querySelector('.carousel-title');
    const eyebrowEl = root.querySelector('.carousel-eyebrow');
    if (titleText && titleEl) titleEl.textContent = titleText;
    if (eyebrowText && eyebrowEl) eyebrowEl.textContent = eyebrowText;

    const images = arrangeCarouselEntries(await resolveCarouselImages(container), featuredTag, featuredEvery);

    if (!images.length) {
      container.dataset.carouselInit = 'true';
      return;
    }

    root.classList.toggle('is-two-row', rows === 2);
    root.classList.toggle('is-autoscroll', shouldAutoscroll);
    root.style.setProperty('--carousel-duration', speed);

    const displayImages = shouldAutoscroll && rows === 2 && images.length % 2 !== 0
      ? images.concat(images[0])
      : images;

    const createCard = (entry, idx, isClone = false) => {
      const card = document.createElement('div');
      card.className = 'carousel-card';
      if (isClone) {
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.setAttribute('role', 'listitem');
      }

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = entry.src;
      img.alt = isClone ? '' : `${label} ${idx + 1}`;

      card.appendChild(img);
      track.appendChild(card);
    };

    track.innerHTML = '';
    displayImages.forEach((entry, idx) => createCard(entry, idx));
    if (shouldAutoscroll) {
      displayImages.forEach((entry, idx) => createCard(entry, idx, true));
    }

    const prevBtn = root.querySelector('[data-carousel-prev]');
    const nextBtn = root.querySelector('[data-carousel-next]');
    const viewport = root.querySelector('.carousel-viewport');
    const scrollAmount = () => {
      const sampleCard = root.querySelector('.carousel-card');
      return sampleCard ? sampleCard.getBoundingClientRect().width + 12 : track.clientWidth * 0.6;
    };
    let manualOffset = 0;

    const getTrackOffset = () => {
      const transform = window.getComputedStyle(track).transform;
      if (!transform || transform === 'none') return manualOffset;

      const values = transform.match(/matrix.*\((.+)\)/);
      if (!values) return manualOffset;

      const parts = values[1].split(',').map((value) => Number.parseFloat(value.trim()));
      return Number.isFinite(parts[4]) ? Math.abs(parts[4]) : manualOffset;
    };

    const pauseAutoscroll = () => {
      if (!shouldAutoscroll) return;

      manualOffset = getTrackOffset();
      root.classList.add('is-manual');
      track.style.transform = `translateX(-${manualOffset}px)`;
      track.getBoundingClientRect();
    };

    const controls = root.querySelector('.carousel-controls');
    const refreshControls = () => {
      const visibleWidth = shouldAutoscroll && viewport ? viewport.clientWidth : track.clientWidth;
      const scrollable = track.scrollWidth - visibleWidth > 8;
      if (controls) controls.classList.toggle('is-hidden', !scrollable);
    };

    const scrollBy = (direction) => {
      if (shouldAutoscroll) {
        pauseAutoscroll();
        const loopWidth = track.scrollWidth / 2;
        manualOffset += direction * scrollAmount();

        if (manualOffset < 0) manualOffset += loopWidth;
        if (manualOffset >= loopWidth) manualOffset -= loopWidth;

        track.style.transform = `translateX(-${manualOffset}px)`;
        return;
      }

      track.scrollBy({ left: direction * scrollAmount(), behavior: 'smooth' });
    };

    prevBtn && prevBtn.addEventListener('click', () => scrollBy(-1));
    nextBtn && nextBtn.addEventListener('click', () => scrollBy(1));

    refreshControls();
    window.addEventListener('resize', refreshControls);
    images.forEach((entry) => {
      const img = new Image();
      img.src = entry.src;
      img.onload = refreshControls;
    });

    container.dataset.carouselInit = 'true';
  };

  const observeCarousels = () => {
    const tryInit = (node) => {
      if (!(node instanceof Element)) return;

      if (node.matches && node.matches(carouselSelector)) {
        initCarousel(node);
      }

      const carouselParent = node.closest ? node.closest(carouselSelector) : null;
      if (carouselParent) {
        initCarousel(carouselParent);
      }

      if (node.querySelectorAll) {
        node.querySelectorAll(carouselSelector).forEach((el) => initCarousel(el));
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
      document.querySelectorAll(carouselSelector).forEach((el) => initCarousel(el));
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
