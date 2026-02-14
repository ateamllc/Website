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

  const siteData = {
    fetchOnce: () => {
      if (window.__siteDataPromise) return window.__siteDataPromise;
      window.__siteDataPromise = fetch('/js/site-data.json', { cache: 'no-cache' })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
      return window.__siteDataPromise;
    },
    get: (path, data) => path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), data),
    renderTemplate: (template, data) =>
      template.replace(/{{\s*([^}\s]+)\s*}}/g, (_, path) => {
        const value = siteData.get(path, data);
        return value !== undefined && value !== null ? value : '';
      })
  };

  const applySiteValues = (root, data) => {
    if (!data || !(root instanceof Element || root === document)) return;

    const forEachNode = (selector, fn) => {
      if (root.matches?.(selector)) fn(root);
      root.querySelectorAll?.(selector).forEach(fn);
    };

    const { contact = {}, reviews = {}, pricing = {} } = data;
    const phoneNumber = contact.phoneE164;
    const phoneDisplay = contact.phoneDisplay || contact.phoneE164;
    const emailAddress = contact.email;

    const looksLikeNumber = (text = '') => /\d{3}[^0-9]*\d{3}[^0-9]*\d{4}/.test(text) || text.trim().startsWith('+');
    const looksLikeEmail = (text = '') => text.includes('@');

    if (phoneNumber) {
      forEachNode('a[href^="tel:"], a[data-site-phone]', (link) => {
        link.setAttribute('href', `tel:${phoneNumber}`);
        if (looksLikeNumber(link.textContent)) {
          link.textContent = phoneDisplay;
        }
      });

      forEachNode('a[href^="sms:"], a[data-site-sms]', (link) => {
        link.setAttribute('href', `sms:${phoneNumber}`);
        if (looksLikeNumber(link.textContent)) {
          link.textContent = phoneDisplay;
        }
      });

      forEachNode('[data-site-phone-text]', (el) => {
        el.textContent = phoneDisplay;
      });
    }

    if (emailAddress) {
      forEachNode('a[href^="mailto:"], a[data-site-email]', (link) => {
        link.setAttribute('href', `mailto:${emailAddress}`);
        if (looksLikeEmail(link.textContent)) {
          link.textContent = emailAddress;
        }
      });
      forEachNode('[data-site-email-text]', (el) => {
        el.textContent = emailAddress;
      });
    }

    if (reviews) {
      const rating = Number(reviews.rating);
      const max = Number(reviews.max) || 5;
      const ratingDisplay = Number.isFinite(rating) ? rating.toFixed(1) : '';
      const maxDisplay = Number.isFinite(max) ? max.toFixed(1) : '';
      const count = reviews.count;
      const starCount = Math.max(0, Math.min(max, Math.round(rating || 0)));
      const stars = '★'.repeat(starCount) + '☆'.repeat(Math.max(0, max - starCount));

      forEachNode('[data-site-review-stars]', (el) => {
        el.textContent = stars;
      });
      forEachNode('[data-site-review-rating]', (el) => {
        el.textContent = ratingDisplay;
      });
      forEachNode('[data-site-review-max]', (el) => {
        el.textContent = maxDisplay;
      });
      forEachNode('[data-site-review-count]', (el) => {
        el.textContent = count ?? '';
      });
    }

    if (pricing) {
      const rate = pricing.baseHourlyRate;
      const formatUSD = (value) =>
        typeof Intl !== 'undefined'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
          : `$${value}`;

      forEachNode('[data-site-base-hourly-rate]', (el) => {
        el.textContent = rate ?? '';
      });
      forEachNode('[data-site-base-hourly-rate-usd]', (el) => {
        el.textContent = rate !== undefined && rate !== null ? formatUSD(rate) : '';
      });
    }

    forEachNode('[data-site-template]', (el) => {
      const template = el.dataset.siteTemplate;
      if (template) {
        el.textContent = siteData.renderTemplate(template, data);
      }
    });
  };

  const startSiteData = () => {
    siteData.fetchOnce().then((data) => {
      if (!data) return;

      const apply = (node = document) => applySiteValues(node, data);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => apply(), { once: true });
      } else {
        apply();
      }

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              apply(node);
            }
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  };

  startSiteData();

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

    const controls = root.querySelector('.carousel-controls');
    const refreshControls = () => {
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
          if (node.matches?.('[data-current-year], #current-year')) {
            applyCurrentYear(node.parentElement || node);
          } else {
            const candidates = node.querySelectorAll?.('[data-current-year], #current-year');
            if (candidates && candidates.length) {
              candidates.forEach(() => applyCurrentYear(node));
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', applyCurrentYear);
  };

  observeCarousels();
  observeCurrentYearTargets();
})();
