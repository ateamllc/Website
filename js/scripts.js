// Basic scripts for small enhancements
(function() {
  // Meta Pixel is intentionally initialized from the common site script so it
  // covers every public page that already loads this file. The public ID is
  // safe to expose; access tokens remain server-only Cloudflare secrets.
  const metaPixelId = '3294200820778684';
  const initializeMetaPixel = () => {
    if (typeof window.fbq === 'function') return;
    const fbq = function() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    fbq('init', metaPixelId);
    fbq('track', 'PageView');
  };
  initializeMetaPixel();

  const attributionStorageKey = 'ateam_first_touch_attribution_v1';
  const attributionCookieKey = 'ateam_first_touch';
  const attributionFieldNames = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'gbraid',
    'wbraid',
    // Meta preserves both its click identifier and first-party browser
    // cookies.  These fields are handled separately in D1, so an interaction
    // with Meta never overwrites evidence of a previous Google touch.
    'fbclid',
    'fbc',
    'fbp'
  ];
  const formAttributionFieldNames = [...attributionFieldNames, 'landing_page', 'first_touch_at'];
  const cleanAttributionValue = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);
  const readCookieValue = (name) => {
    const prefix = `${name}=`;
    const part = document.cookie.split(';').map((value) => value.trim()).find((value) => value.startsWith(prefix));
    return part ? decodeURIComponent(part.slice(prefix.length)) : '';
  };

  const readStoredAttribution = () => {
    try {
      const value = window.localStorage.getItem(attributionStorageKey);
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (error) {
      // Fall through to the first-party cookie when storage is unavailable.
    }

    const cookie = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${attributionCookieKey}=`));
    if (!cookie) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(cookie.slice(attributionCookieKey.length + 1)));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const legacySessionAttribution = () => {
    const values = {};
    attributionFieldNames.forEach((name) => {
      try {
        const value = window.sessionStorage.getItem(`ateam_${name}`);
        if (value) values[name] = cleanAttributionValue(value);
      } catch (error) {
        // Ignore legacy storage errors so form submission is never blocked.
      }
    });
    return values;
  };

  const persistAttribution = (values) => {
    const serialized = JSON.stringify(values);
    try {
      window.localStorage.setItem(attributionStorageKey, serialized);
    } catch (error) {
      // The cookie below remains as the storage fallback.
    }
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${attributionCookieKey}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${90 * 24 * 60 * 60}; SameSite=Lax${secure}`;
  };

  const captureFirstTouchAttribution = () => {
    const existing = readStoredAttribution() || {};

    const params = new URLSearchParams(window.location.search);
    const queryValues = Object.fromEntries(attributionFieldNames.map((name) => [
      name,
      cleanAttributionValue(params.get(name), name.startsWith('utm_') ? 300 : 500)
    ]));
    // `_fbc` and `_fbp` are Meta's browser identifiers.  Build a valid fbc
    // when the landing URL contains fbclid, even if the Pixel has not yet had
    // a chance to create its cookie.
    const fbclid = queryValues.fbclid;
    queryValues.fbc = queryValues.fbc || cleanAttributionValue(readCookieValue('_fbc')) || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
    queryValues.fbp = queryValues.fbp || cleanAttributionValue(readCookieValue('_fbp'));
    const legacyValues = legacySessionAttribution();
    const values = Object.fromEntries(attributionFieldNames.map((name) => [
      name,
      queryValues[name] || legacyValues[name] || ''
    ]));
    if (existing.first_touch_at) {
      const merged = { ...existing };
      let changed = false;
      attributionFieldNames.forEach((name) => {
        if (!merged[name] && values[name]) { merged[name] = values[name]; changed = true; }
      });
      if (changed) persistAttribution(merged);
      return merged;
    }
    if (!Object.values(values).some(Boolean)) return existing;

    const firstTouch = {
      ...values,
      landing_page: cleanAttributionValue(window.location.href.split('#')[0], 1000),
      first_touch_at: new Date().toISOString()
    };
    persistAttribution(firstTouch);
    return firstTouch;
  };

  const getAttributionValues = () => captureFirstTouchAttribution();

  const setFormAttributionFields = (form) => {
    if (!form || !(form instanceof HTMLFormElement)) return;

    const values = getAttributionValues();
    formAttributionFieldNames.forEach((name) => {
      let field = form.querySelector(`input[name="${name}"]`);
      if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        form.appendChild(field);
      }

      if (!field.value) field.value = values[name] || '';
    });
  };

  const populateAttributionForms = (root = document) => {
    if (root instanceof HTMLFormElement) setFormAttributionFields(root);
    root.querySelectorAll?.('form').forEach((form) => setFormAttributionFields(form));
  };

  window.ATeamAttribution = Object.freeze({
    getFirstTouch: () => ({ ...(readStoredAttribution() || {}) }),
    populateForm: (form) => setFormAttributionFields(form)
  });

  // Paid-search visitors see the Twilio number; everybody else keeps the
  // published business number. A call intent is recorded before `tel:` hands
  // control to the device so Twilio can later attribute the actual inbound
  // call without treating direct/organic callers as paid traffic.
  const businessCallNumber = '+18014777526';
  const paidCallTrackingNumber = '+13852826445';
  const callIntentEndpoint = 'https://ateam-lead-automation.pages.dev/api/call-intent';
  const callVisitorStorageKey = 'ateam_paid_call_visitor_v1';

  const normalizedPhone = (value) => {
    const digits = String(value || '').replace(/\D+/g, '');
    if (digits.length === 10) return `+1${digits}`;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : '';
  };

  const isPaidGoogleAttribution = (values) => {
    if (values?.gclid || values?.gbraid || values?.wbraid) return true;
    return /^(google|google_ads)$/i.test(values?.utm_source || '') && /^(cpc|ppc|paid|paid_search)$/i.test(values?.utm_medium || '');
  };

  const paidCallVisitorId = () => {
    try {
      const existing = window.localStorage.getItem(callVisitorStorageKey);
      if (existing) return existing;
      const next = `pcv_${crypto.randomUUID()}`;
      window.localStorage.setItem(callVisitorStorageKey, next);
      return next;
    } catch (error) {
      return `pcv_${crypto.randomUUID()}`;
    }
  };

  const swapPaidCallLinks = (root = document) => {
    if (!isPaidGoogleAttribution(getAttributionValues())) return;
    const links = root.matches?.('a[href^="tel:"]') ? [root] : Array.from(root.querySelectorAll?.('a[href^="tel:"]') || []);
    links.forEach((link) => {
      const original = normalizedPhone(link.dataset.ateamOriginalCall || link.getAttribute('href'));
      if (original !== businessCallNumber) return;
      link.dataset.ateamOriginalCall = businessCallNumber;
      link.dataset.ateamPaidCall = 'true';
      link.href = `tel:${paidCallTrackingNumber}`;
      if (/\(?801\)?[\s.-]*477[\s.-]*7526/.test(link.textContent || '')) {
        link.textContent = link.textContent.replace(/\(?801\)?[\s.-]*477[\s.-]*7526/g, '(385) 282-6445');
      }
    });
  };

  const recordPaidCallIntent = (link) => {
    if (link?.dataset.ateamPaidCall !== 'true') return;
    const attribution = getAttributionValues();
    const payload = {
      id: `pci_${crypto.randomUUID()}`,
      visitorId: paidCallVisitorId(),
      trackingNumber: paidCallTrackingNumber,
      originalNumber: link.dataset.ateamOriginalCall || businessCallNumber,
      gclid: attribution.gclid || '', gbraid: attribution.gbraid || '', wbraid: attribution.wbraid || '',
      utmSource: attribution.utm_source || '', utmMedium: attribution.utm_medium || '', utmCampaign: attribution.utm_campaign || '',
      landingPage: attribution.landing_page || window.location.href.split('#')[0],
      pageUrl: window.location.href.split('#')[0],
      callLabel: (link.getAttribute('aria-label') || link.textContent || 'Call').trim().slice(0, 300),
      clickedAt: new Date().toISOString()
    };
    // `keepalive` lets the request complete even when a mobile browser opens
    // the dialer immediately. Failure never prevents a customer from calling.
    fetch(callIntentEndpoint, {
      method: 'POST', mode: 'cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  };

  const initializePaidCallTracking = (root = document) => swapPaidCallLinks(root);
  document.addEventListener('click', (event) => recordPaidCallIntent(event.target.closest('a[href^="tel:"]')), true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      populateAttributionForms();
      initializePaidCallTracking();
    }, { once: true });
  } else {
    populateAttributionForms();
    initializePaidCallTracking();
  }
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            populateAttributionForms(node);
            initializePaidCallTracking(node);
          }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

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

  const updateResourceCarouselControls = (carousel) => {
    const track = carousel ? carousel.querySelector('.resource-grid') : null;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.resource-card'));
    const currentIndex = Math.max(0, Math.min(
      cards.length - 1,
      Number.parseInt(carousel.dataset.resourceIndex || '0', 10)
    ));
    const activeCard = cards[currentIndex] || null;
    const activeVideo = activeCard ? activeCard.querySelector('.video-frame') : null;
    const arrowTarget = activeVideo || activeCard;
    if (!arrowTarget) return;

    const carouselRect = carousel.getBoundingClientRect();
    const targetRect = arrowTarget.getBoundingClientRect();
    const arrowTop = targetRect.top - carouselRect.top + (targetRect.height / 2);

    carousel.style.setProperty('--resource-arrow-top', `${Math.round(arrowTop)}px`);
  };

  const scrollResourceCarousel = (button) => {
    const carousel = button.closest('[data-resource-carousel]');
    const track = carousel ? carousel.querySelector('.resource-grid') : null;
    if (!track) return;

    const direction = button.matches('[data-resource-prev]') ? -1 : 1;
    const cards = Array.from(track.querySelectorAll('.resource-card'));
    if (!cards.length) return;

    const currentIndex = Number.parseInt(carousel.dataset.resourceIndex || '0', 10);
    const nextIndex = Math.max(0, Math.min(cards.length - 1, currentIndex + direction));
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || '0');
    const offset = nextIndex * (track.clientWidth + gap);

    carousel.dataset.resourceIndex = String(nextIndex);
    track.style.transform = `translateX(-${offset}px)`;
    updateResourceCarouselControls(carousel);
  };

  const initResourceCarousels = () => {
    const carousels = document.querySelectorAll('[data-resource-carousel]');

    carousels.forEach((carousel) => updateResourceCarouselControls(carousel));

    document.querySelectorAll('[data-resource-prev], [data-resource-next]').forEach((button) => {
      if (button.dataset.resourceScrollInit === 'true') return;
      button.dataset.resourceScrollInit = 'true';
      button.addEventListener('click', () => scrollResourceCarousel(button));
    });

    window.addEventListener('resize', () => {
      carousels.forEach((carousel) => updateResourceCarouselControls(carousel));
    });
  };

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

    const alt = isObject && entry.alt ? String(entry.alt).trim() : '';

    return { src: resolvedSrc, tags, alt };
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
    const speed = container.dataset.carouselSpeed || '160s';
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
      img.decoding = 'async';
      img.fetchPriority = 'low';
      img.src = entry.src;
      img.alt = isClone ? '' : entry.alt || `${label} ${idx + 1}`;

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

    container.dataset.carouselInit = 'true';
  };

  const scheduleCarouselInit = (container) => {
    if (!container || container.dataset.carouselInit === 'true' || container.dataset.carouselInit === 'loading' || container.dataset.carouselObserve === 'true') return;
    if (!container.querySelector('[data-carousel-root]')) return;

    if (container.dataset.carouselLazyInit === 'false' || !('IntersectionObserver' in window)) {
      initCarousel(container);
      return;
    }

    container.dataset.carouselObserve = 'true';
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        observer.disconnect();
        delete container.dataset.carouselObserve;
        initCarousel(container);
      });
    }, { rootMargin: '700px 0px' });

    observer.observe(container);
  };

  const observeCarousels = () => {
    const tryInit = (node) => {
      if (!(node instanceof Element)) return;

      if (node.matches && node.matches(carouselSelector)) {
        scheduleCarouselInit(node);
      }

      const carouselParent = node.closest ? node.closest(carouselSelector) : null;
      if (carouselParent) {
        scheduleCarouselInit(carouselParent);
      }

      if (node.querySelectorAll) {
        node.querySelectorAll(carouselSelector).forEach((el) => scheduleCarouselInit(el));
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
      document.querySelectorAll(carouselSelector).forEach((el) => scheduleCarouselInit(el));
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

  const trackEvent = (eventName, params = {}) => {
    if (!eventName) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }
  };

  const observeTrackingTargets = () => {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('[data-track-event]');
      if (!target) return;

      trackEvent(target.dataset.trackEvent, {
        event_category: target.dataset.trackCategory || 'landing_page',
        event_label: target.dataset.trackLabel || target.textContent.trim()
      });
    });

    document.addEventListener('input', (event) => {
      const form = event.target.closest('form[data-track-form]');
      if (!form || form.dataset.trackStarted === 'true') return;

      setFormAttributionFields(form);
      const startEvent = form.dataset.trackStartEvent || 'estimate_form_start';
      form.dataset.trackStarted = 'true';
      trackEvent(startEvent, {
        event_category: 'lead_form',
        event_label: form.dataset.trackForm
      });
    });

    document.addEventListener('submit', (event) => {
      const form = event.target.closest('form[data-track-form]');
      if (!form) return;

      setFormAttributionFields(form);
      const submitEvent = form.dataset.trackSubmitEvent || 'estimate_form_submit';
      trackEvent(submitEvent, {
        event_category: 'lead_form',
        event_label: form.dataset.trackForm
      });
    });
  };

  const validateContactRequirement = (form) => {
    if (!form || !form.matches('[data-require-contact]')) return true;

    const fields = ['phone', 'email', 'project_address']
      .map((name) => form.querySelector(`[name="${name}"]`))
      .filter(Boolean);
    if (!fields.length || fields.some((field) => field.value.trim())) {
      fields.forEach((field) => field.setCustomValidity(''));
      return true;
    }

    const target = fields[0];
    target.setCustomValidity('Please add at least one communication method');
    target.reportValidity();
    fields.forEach((field) => {
      field.addEventListener('input', () => {
        fields.forEach((contactField) => contactField.setCustomValidity(''));
      }, { once: true });
    });
    return false;
  };

  window.ATeamForms = Object.assign(window.ATeamForms || {}, {
    validateContactRequirement
  });

  document.addEventListener('submit', (event) => {
    setFormAttributionFields(event.target);

    if (!validateContactRequirement(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Cloudflare owns durable lead processing. Web3Forms receives the same
  // submission as an independent email backup with a shared reconciliation ID.
  const cloudflareIntakeUrl = 'https://admin.ateamutah.com/api/public-form-intake';
  const isWeb3Form = (form) => form instanceof HTMLFormElement
    && /^https:\/\/api\.web3forms\.com\/submit\/?$/i.test(form.action || '');
  const cloudflareSubmissionId = (form) => {
    let field = form.querySelector('input[name="parallel_submission_id"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = 'parallel_submission_id';
      form.appendChild(field);
    }
    if (!field.value) {
      const uuid = window.crypto && typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      field.value = `wfi_${uuid}`;
    }
    return field.value;
  };
  const cloudflareFields = (form) => {
    const values = {};
    new FormData(form).forEach((value, key) => {
      if (/^access_key$/i.test(key)) return;
      if (value instanceof File) {
        values[key] = value.name ? `[file: ${value.name}, ${value.size} bytes]` : '';
      } else if (Object.prototype.hasOwnProperty.call(values, key)) {
        values[key] = `${values[key]}\n${String(value || '')}`;
      } else {
        values[key] = String(value || '');
      }
    });
    return values;
  };
  const submitCloudflarePrimary = async (form) => {
    const submissionId = cloudflareSubmissionId(form);
    const fields = cloudflareFields(form);
    const payload = {
      submissionId,
      formId: fields.form_id || form.id || 'website_form',
      formName: fields.form_name || '',
      pageUrl: window.location.href.split('#')[0],
      fields
    };
    const response = await fetch(cloudflareIntakeUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `Cloudflare intake failed (${response.status}).`);
    return result;
  };
  const submitWeb3Backup = async (form) => {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      keepalive: true
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) throw new Error(result.message || `Web3Forms backup failed (${response.status}).`);
    return result;
  };
  const formFeedback = (form) => {
    let feedback = form.querySelector('[data-form-delivery-status]');
    if (!feedback) {
      feedback = document.createElement('p');
      feedback.dataset.formDeliveryStatus = '';
      feedback.setAttribute('role', 'status');
      feedback.className = 'form-delivery-status';
      form.appendChild(feedback);
    }
    return feedback;
  };
  const successUrlFor = (form) => {
    const configured = form.dataset.successUrl || (form.querySelector('input[name="redirect"]') || {}).value || '/pages/thank-you';
    return new URL(configured, window.location.origin).toString();
  };
  const trackCanonicalLead = (form, result) => {
    const submission = result && result.submission || {};
    // Emit this only after canonical Cloudflare intake succeeds. It separates
    // accepted leads from the earlier form-attempt event without sending PII.
    // Wait briefly for gtag's completion callback before redirecting; otherwise
    // navigation can cancel the accepted-lead event in the browser.
    return new Promise((resolve) => {
      let complete = false;
      const finish = () => {
        if (complete) return;
        complete = true;
        resolve();
      };
      const params = {
      event_category: 'lead_form',
      event_label: form.dataset.trackForm || form.id || 'website_form',
      form_id: form.querySelector('input[name="form_id"]')?.value || form.id || 'website_form',
      cloudflare_submission_id: submission.id || '',
      reconciliation_id: submission.reconciliationId || '',
        transport_type: 'beacon',
        event_callback: finish,
        event_timeout: 1200
      };
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'generate_lead', ...params });
      if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', params);
      // The server-side raw-lead event uses this exact ID, so Meta deduplicates
      // the browser Pixel and CAPI copies once CAPI uploads are enabled.
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
          content_name: params.form_id,
          content_category: 'website_form'
        }, { eventID: `ateam:${submission.id || submission.reconciliationId || crypto.randomUUID()}:raw_lead` });
      }
      else finish();
      window.setTimeout(finish, 1250);
    });
  };
  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!isWeb3Form(form)) return;
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      form.reportValidity();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();

    const honeypot = form.querySelector('input[name="botcheck"], input[name="_honey"]');
    if (honeypot && honeypot.value.trim()) return;
    const feedback = formFeedback(form);
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    feedback.textContent = 'Submitting...';

    const backupPromise = submitWeb3Backup(form);
    try {
      const result = await submitCloudflarePrimary(form);
      await trackCanonicalLead(form, result);
      backupPromise.catch((error) => console.warn('Web3Forms backup submission failed', error));
      window.location.assign(successUrlFor(form));
      return;
    } catch (primaryError) {
      console.error('Cloudflare form submission failed', primaryError);
    }

    try {
      await backupPromise;
      window.location.assign(successUrlFor(form));
    } catch (backupError) {
      console.error('Web3Forms backup submission failed', backupError);
      feedback.textContent = 'We could not submit the form. Please call or text (801) 477-7526.';
      if (submitButton) submitButton.disabled = false;
    }
  }, true);

  const loadJson = async (src) => {
    if (!src) return null;

    const response = await fetch(src);
    if (!response.ok) throw new Error(`JSON request failed for ${src}: ${response.status}`);
    return response.json();
  };

  const setText = (root, selector, value) => {
    const el = root.querySelector(selector);
    if (el && value) el.textContent = value;
  };

  const createTrustItem = (item, isClone = false) => {
    const el = document.createElement(item.href ? 'a' : 'span');
    el.className = `trust-strip__item${item.stars ? ' trust-strip__review' : ''}${isClone ? ' trust-strip__item--clone' : ''}`;

    if (item.href) {
      el.href = item.href;
      el.target = '_blank';
      el.rel = 'noopener';
    }

    if (isClone) {
      el.setAttribute('aria-hidden', 'true');
      if (item.href) el.tabIndex = -1;
    }

    if (item.stars) {
      const stars = document.createElement('span');
      stars.setAttribute('aria-hidden', 'true');
      stars.textContent = '★★★★★';
      el.appendChild(stars);

      const strong = document.createElement('strong');
      strong.textContent = item.label || '';
      el.appendChild(strong);
      return el;
    }

    el.textContent = item.label || '';
    return el;
  };

  const initTrustStrip = async (section) => {
    const target = section.querySelector('[data-trust-strip-items]');
    if (!target || section.dataset.snippetInit === 'true' || section.dataset.snippetInit === 'loading') return;

    section.dataset.snippetInit = 'loading';
    try {
      const items = await loadJson(section.dataset.trustSrc);
      if (!Array.isArray(items)) throw new Error('Trust strip data must be an array');

      target.innerHTML = '';
      items.forEach((item) => target.appendChild(createTrustItem(item)));
      items.forEach((item) => target.appendChild(createTrustItem(item, true)));
      section.dataset.snippetInit = 'true';
    } catch (error) {
      section.dataset.snippetInit = 'error';
      console.warn('Could not initialize trust strip', error);
    }
  };

  const createReviewCard = (review) => {
    const article = document.createElement('article');
    article.className = review.href ? 'review-card review-card--cta' : 'review-card';

    const stars = document.createElement('div');
    stars.className = 'review-card__stars';
    stars.setAttribute('aria-hidden', 'true');
    stars.textContent = '★★★★★';
    article.appendChild(stars);

    const quote = document.createElement('p');
    quote.className = 'review-card__quote';
    quote.textContent = review.quote || '';
    article.appendChild(quote);

    if (review.href) {
      const link = document.createElement('a');
      link.className = 'btn btn-primary';
      link.href = review.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = review.label || 'Read more';
      article.appendChild(link);
      return article;
    }

    const name = document.createElement('p');
    name.className = 'review-card__name';
    name.textContent = review.name || '';
    article.appendChild(name);
    return article;
  };

  const initReviewCarouselControls = (section) => {
    const carousel = section.querySelector('.review-carousel');
    const prevBtn = section.querySelector('[data-review-carousel-prev]');
    const nextBtn = section.querySelector('[data-review-carousel-next]');
    if (!carousel || !prevBtn || !nextBtn || section.dataset.reviewControlsInit === 'true') return;

    const scrollAmount = () => {
      const card = carousel.querySelector('.review-card');
      if (!card) return carousel.clientWidth * 0.85;

      const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap || '0');
      return card.getBoundingClientRect().width + gap;
    };

    prevBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });

    section.dataset.reviewControlsInit = 'true';
  };

  const initReviewSection = async (section) => {
    const target = section.querySelector('[data-review-carousel-items]');
    if (!target || section.dataset.snippetInit === 'true' || section.dataset.snippetInit === 'loading') return;

    const cta = section.querySelector('[data-review-cta]');
    if (cta) {
      let ctaHref = section.dataset.reviewCtaHref || '';
      let sibling = section.nextElementSibling;
      while (!ctaHref && sibling) {
        if (sibling.matches('.estimate-photo-section, [data-estimate-form]')) {
          const formId = sibling.dataset.formId || sibling.querySelector('form')?.id;
          if (formId) ctaHref = `#${formId}`;
          break;
        }
        sibling = sibling.nextElementSibling;
      }
      cta.href = ctaHref || '/pages/contact';
    }

    section.dataset.snippetInit = 'loading';
    setText(section, '[data-review-eyebrow]', section.dataset.reviewEyebrow);
    setText(section, '[data-review-title]', section.dataset.reviewTitle);
    setText(section, '[data-review-intro]', section.dataset.reviewIntro);

    try {
      const data = await loadJson(section.dataset.reviewsSrc);
      const reviews = Array.isArray(data) ? data : data.reviews;
      if (!Array.isArray(reviews)) throw new Error('Review data must be an array or include a reviews array');

      target.innerHTML = '';
      reviews.forEach((review) => target.appendChild(createReviewCard(review)));
      if (data.cta) target.appendChild(createReviewCard(data.cta));
      section.dataset.snippetInit = 'true';
      initReviewCarouselControls(section);
    } catch (error) {
      section.dataset.snippetInit = 'error';
      console.warn('Could not initialize review carousel', error);
    }
  };

  const initEstimateForm = (section) => {
    const form = section.querySelector('form');
    if (!form || section.dataset.snippetInit === 'true') return;

    const titleCase = (value) => String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const formId = section.dataset.formId || 'landing-page-estimate';
    const formKey = formId.replace(/-form$/, '').replace(/-/g, '_');
    const subjectFormName = (section.dataset.subject || '').replace(/^A Team Lead \|\s*/, '').trim();
    const formName = section.dataset.formName || subjectFormName || titleCase(formId.replace(/-form$/, ''));
    const serviceCategories = {
      deck_fence_staining_estimate: 'Fences, Gates & Outdoor Structures',
      door_repair_installation_estimate: 'Fixture Installs & Replacements',
      drywall_repair_estimate: 'Drywall Repair & Finish Work',
      fence_estimate: 'Fences, Gates & Outdoor Structures',
      fence_repair_estimate: 'Fences, Gates & Outdoor Structures',
      flooring_estimate: 'General Construction',
      framing_estimate: 'General Construction',
      furniture_assembly_estimate: 'Fixture Installs & Replacements',
      handyman_estimate: 'Fixture Installs & Replacements',
      honey_do_estimate: 'Fixture Installs & Replacements',
      painting_estimate: 'Interior/Exterior Painting',
      pergolas_estimate: 'Fences, Gates & Outdoor Structures',
      property_manager_application: 'Property Management & Maintenance',
      rental_ready_maintenance_estimate: 'Property Management & Maintenance',
      roofing_estimate: 'General Construction',
      shed_building_estimate: 'Fences, Gates & Outdoor Structures',
      siding_estimate: 'General Construction',
      trim_baseboard_installation_estimate: 'General Construction',
      tv_mounting_estimate: 'Fixture Installs & Replacements'
    };

    setText(section, '[data-estimate-eyebrow]', section.dataset.estimateEyebrow);
    setText(section, '[data-estimate-title]', section.dataset.estimateTitle);
    setText(section, '[data-estimate-copy]', section.dataset.estimateCopy);
    setText(section, '[data-estimate-note]', section.dataset.estimateNote);
    setText(section, '[data-estimate-submit]', section.dataset.submitLabel);
    setText(section, '[data-for="city"]', section.dataset.cityLabel);
    setText(section, '[data-for="message"]', section.dataset.messageLabel);
    setText(section, '.form-microcopy', section.dataset.phoneMicrocopy);

    const messageField = section.querySelector('[data-field="message"]');
    if (messageField && section.dataset.messagePlaceholder) {
      messageField.placeholder = section.dataset.messagePlaceholder;
    }

    form.id = formId;
    form.dataset.trackForm = section.dataset.trackForm || formId;

    const setHiddenValue = (name, value) => {
      const field = form.querySelector(`input[name="${name}"]`);
      if (field && value) field.value = value;
    };

    setHiddenValue('subject', `A Team Lead | ${formName}`);
    setHiddenValue('from_name', section.dataset.fromName || 'A Team Property Improvement');
    setHiddenValue('form_id', formKey);
    setHiddenValue('form_name', formName);
    setHiddenValue('form_source', section.dataset.formSource || 'Website landing page');
    setHiddenValue('page_url', window.location.href);
    setHiddenValue('service_category', section.dataset.serviceCategory || serviceCategories[formKey] || 'Unspecified');
    setHiddenValue('lead_source', section.dataset.leadSource || 'website_form');

    section.querySelectorAll('[data-field]').forEach((field) => {
      field.id = `${formId}-${field.dataset.field}`;
    });

    section.querySelectorAll('[data-for]').forEach((label) => {
      label.setAttribute('for', `${formId}-${label.dataset.for}`);
    });

    const call = section.querySelector('[data-estimate-call]');
    if (call) {
      call.textContent = section.dataset.callLabel || call.textContent;
      if (section.dataset.callHref) call.href = section.dataset.callHref;
    }

    const text = section.querySelector('[data-estimate-text]');
    if (text) {
      text.textContent = section.dataset.textLabel || text.textContent;
      if (section.dataset.textHref) text.href = section.dataset.textHref;
    }

    section.dataset.snippetInit = 'true';
  };

  const initScopeSection = async (section) => {
    const list = section.querySelector('[data-scope-items]');
    if (!list || section.dataset.snippetInit === 'true' || section.dataset.snippetInit === 'loading') return;

    section.dataset.snippetInit = 'loading';
    setText(section, '[data-scope-eyebrow]', section.dataset.scopeEyebrow);
    setText(section, '[data-scope-title]', section.dataset.scopeTitle);
    setText(section, '[data-scope-intro]', section.dataset.scopeIntro);

    const cta = section.querySelector('[data-scope-cta]');
    if (cta) {
      cta.textContent = section.dataset.scopeCtaLabel || cta.textContent;
      cta.href = section.dataset.scopeCtaHref || cta.href;
    }

    try {
      const items = await loadJson(section.dataset.scopeSrc);
      if (!Array.isArray(items)) throw new Error('Scope clarity data must be an array');

      list.innerHTML = '';
      items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      section.dataset.snippetInit = 'true';
    } catch (error) {
      section.dataset.snippetInit = 'error';
      console.warn('Could not initialize scope clarity section', error);
    }
  };

  const initFinalCta = (section) => {
    if (!section.querySelector('[data-final-cta-title]') || section.dataset.snippetInit === 'true') return;

    setText(section, '[data-final-cta-title]', section.dataset.finalCtaTitle);
    setText(section, '[data-final-cta-copy]', section.dataset.finalCtaCopy);

    const secondary = section.querySelector('[data-final-cta-secondary]');
    if (secondary) {
      secondary.textContent = section.dataset.secondaryLabel || secondary.textContent;
      secondary.href = section.dataset.secondaryHref || secondary.href;
    }

    const primary = section.querySelector('[data-final-cta-primary]');
    if (primary) {
      primary.textContent = section.dataset.primaryLabel || primary.textContent;
      primary.href = section.dataset.primaryHref || primary.href;
    }

    section.dataset.snippetInit = 'true';
  };

  const initStickyCtaSnippet = (container) => {
    if (!container.querySelector('[data-sticky-call]') || container.dataset.snippetInit === 'true') return;

    const call = container.querySelector('[data-sticky-call]');
    call.textContent = container.dataset.callLabel || call.textContent;
    call.href = container.dataset.callHref || call.href;

    const text = container.querySelector('[data-sticky-text]');
    text.textContent = container.dataset.textLabel || text.textContent;
    text.href = container.dataset.textHref || text.href;

    const estimate = container.querySelector('[data-sticky-estimate]');
    estimate.textContent = container.dataset.estimateLabel || estimate.textContent;
    estimate.href = container.dataset.estimateHref || estimate.href;

    container.dataset.snippetInit = 'true';
  };

  const initProblemSolution = async (container) => {
    const list = container.querySelector('[data-problem-items]');
    if (!list || container.dataset.snippetInit === 'true' || container.dataset.snippetInit === 'loading') return;

    container.dataset.snippetInit = 'loading';
    setText(container, '[data-problem-eyebrow]', container.dataset.problemEyebrow);
    setText(container, '[data-problem-title-start]', container.dataset.problemTitleStart);
    setText(container, '[data-problem-title-end]', container.dataset.problemTitleEnd);
    setText(container, '[data-problem-note]', container.dataset.problemNote);

    const primary = container.querySelector('[data-problem-primary]');
    if (primary) {
      primary.textContent = container.dataset.primaryLabel || primary.textContent;
      primary.href = container.dataset.primaryHref || primary.href;
    }

    const secondary = container.querySelector('[data-problem-secondary]');
    if (secondary) {
      secondary.textContent = container.dataset.secondaryLabel || secondary.textContent;
      secondary.href = container.dataset.secondaryHref || secondary.href;
    }

    try {
      const items = await loadJson(container.dataset.problemSrc);
      if (!Array.isArray(items)) throw new Error('Problem solution data must be an array');

      list.innerHTML = '';
      items.forEach((item) => {
        const li = document.createElement('li');
        if (item.html) {
          li.innerHTML = item.html;
        } else {
          li.innerHTML = `${item.problem || ''} <span class="service-arrow" aria-hidden="true">➡</span> ${item.solutionHtml || ''}`;
        }
        list.appendChild(li);
      });
      container.dataset.snippetInit = 'true';
    } catch (error) {
      container.dataset.snippetInit = 'error';
      console.warn('Could not initialize problem solution section', error);
    }
  };

  const initFaqSection = async (section) => {
    const list = section.querySelector('[data-faq-items]');
    if (!list || section.dataset.snippetInit === 'true' || section.dataset.snippetInit === 'loading') return;

    section.dataset.snippetInit = 'loading';
    setText(section, '[data-faq-eyebrow]', section.dataset.faqEyebrow);
    setText(section, '[data-faq-title]', section.dataset.faqTitle);

    try {
      const items = await loadJson(section.dataset.faqSrc);
      if (!Array.isArray(items)) throw new Error('FAQ data must be an array');

      list.innerHTML = '';
      items.forEach((item) => {
        const question = document.createElement('dt');
        question.textContent = item.question || '';
        list.appendChild(question);

        const answer = document.createElement('dd');
        answer.textContent = item.answer || '';
        list.appendChild(answer);
      });
      section.dataset.snippetInit = 'true';
    } catch (error) {
      section.dataset.snippetInit = 'error';
      console.warn('Could not initialize FAQ section', error);
    }
  };

  const initWhatWeDoSection = async (section) => {
    const list = section.querySelector('[data-what-we-do-items]');
    if (!list || section.dataset.snippetInit === 'true' || section.dataset.snippetInit === 'loading') return;

    section.dataset.snippetInit = 'loading';
    setText(section, '[data-what-we-do-eyebrow]', section.dataset.whatWeDoEyebrow);
    setText(section, '[data-what-we-do-title]', section.dataset.whatWeDoTitle);
    setText(section, '[data-what-we-do-intro]', section.dataset.whatWeDoIntro);

    const cta = section.querySelector('[data-what-we-do-cta]');
    if (cta) {
      cta.textContent = section.dataset.whatWeDoCtaLabel || cta.textContent;
      cta.href = section.dataset.whatWeDoCtaHref || cta.href;
    }

    try {
      const items = await loadJson(section.dataset.whatWeDoSrc);
      if (!Array.isArray(items)) throw new Error('What we do data must be an array');

      list.innerHTML = '';
      items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      section.dataset.snippetInit = 'true';
    } catch (error) {
      section.dataset.snippetInit = 'error';
      console.warn('Could not initialize what we do section', error);
    }
  };

  const findSnippetRoots = (root, selector) => {
    const matches = [];
    if (root instanceof Element && root.matches(selector)) matches.push(root);
    if (root.querySelectorAll) {
      root.querySelectorAll(selector).forEach((el) => matches.push(el));
    }
    return matches;
  };

  const initLandingHero = (section) => {
    if (!section.querySelector('[data-landing-hero-bg]') || section.dataset.snippetInit === 'true') return;

    const background = section.querySelector('[data-landing-hero-bg]');
    if (background && section.dataset.heroImage) {
      background.style.backgroundImage = `url('${section.dataset.heroImage}')`;
    }

    setText(section, '[data-landing-hero-eyebrow]', section.dataset.heroEyebrow);
    setText(section, '[data-landing-hero-title]', section.dataset.heroTitle);
    setText(section, '[data-landing-hero-subtitle]', section.dataset.heroSubtitle);
    setText(section, '[data-landing-hero-primary-full]', section.dataset.primaryLabel);
    setText(section, '[data-landing-hero-primary-short]', section.dataset.primaryMobileLabel);
    setText(section, '[data-landing-hero-call-full]', section.dataset.callLabel);
    setText(section, '[data-landing-hero-call-short]', section.dataset.callMobileLabel);

    const primary = section.querySelector('[data-landing-hero-primary]');
    if (primary) primary.href = section.dataset.primaryHref || primary.href;

    const call = section.querySelector('[data-landing-hero-call]');
    if (call) call.href = section.dataset.callHref || call.href;

    const text = section.querySelector('[data-landing-hero-text]');
    if (text) {
      text.textContent = section.dataset.textLabel || text.textContent;
      text.href = section.dataset.textHref || text.href;
    }

    section.dataset.snippetInit = 'true';
  };

  const initLandingSnippets = (root = document) => {
    findSnippetRoots(root, '[data-landing-hero]').forEach((section) => initLandingHero(section));
    findSnippetRoots(root, '[data-trust-src]').forEach((section) => initTrustStrip(section));
    findSnippetRoots(root, '[data-review-section]').forEach((section) => initReviewSection(section));
    findSnippetRoots(root, '[data-estimate-form]').forEach((section) => initEstimateForm(section));
    findSnippetRoots(root, '[data-scope-section]').forEach((section) => initScopeSection(section));
    findSnippetRoots(root, '[data-final-cta]').forEach((section) => initFinalCta(section));
    findSnippetRoots(root, '[data-sticky-cta]').forEach((container) => initStickyCtaSnippet(container));
    findSnippetRoots(root, '[data-problem-solution]').forEach((container) => initProblemSolution(container));
    findSnippetRoots(root, '[data-faq-section]').forEach((section) => initFaqSection(section));
    findSnippetRoots(root, '[data-what-we-do-section]').forEach((section) => initWhatWeDoSection(section));
  };

  const observeLandingSnippets = () => {
    initLandingSnippets();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          initLandingSnippets(node.parentElement || node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', () => initLandingSnippets());
  };

  const observeReviewCarousels = () => {
    document.querySelectorAll('.review-carousel-section').forEach((section) => {
      initReviewCarouselControls(section);
    });
  };

  const observeStickyCta = () => {
    const stickyCta = document.querySelector('.mobile-sticky-cta');
    const trigger = document.querySelector('.handyman-lander .carousel-shell');
    if (!stickyCta || !trigger) return;

    const updateStickyCta = () => {
      const triggerBottom = trigger.getBoundingClientRect().bottom;
      const isPastCarousel = triggerBottom <= window.innerHeight;
      stickyCta.classList.toggle('is-visible', isPastCarousel);
      document.body.classList.toggle('has-sticky-cta', isPastCarousel);
    };

    updateStickyCta();
    window.addEventListener('scroll', updateStickyCta, { passive: true });
    window.addEventListener('resize', updateStickyCta);
  };

  const observeLazyBackgrounds = () => {
    const applyBackground = (el) => {
      if (!el || el.dataset.lazyBgLoaded === 'true' || !el.dataset.lazyBg) return;

      el.style.setProperty('--section-bg-image', `url('${el.dataset.lazyBg}')`);
      el.dataset.lazyBgLoaded = 'true';
    };

    const targets = document.querySelectorAll('[data-lazy-bg]');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => applyBackground(el));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        applyBackground(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '700px 0px' });

    targets.forEach((el) => observer.observe(el));
  };

  observeCarousels();
  initResourceCarousels();
  observeCurrentYearTargets();
  observeTrackingTargets();
  observeLandingSnippets();
  observeReviewCarousels();
  observeStickyCta();
  observeLazyBackgrounds();
})();
