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

  const updateResourceCarouselControls = (carousel) => {
    const track = carousel ? carousel.querySelector('.resource-grid') : null;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.resource-card'));
    const currentIndex = Math.max(0, Math.min(
      cards.length - 1,
      Number.parseInt(carousel.dataset.resourceIndex || '0', 10)
    ));
    const activeVideo = cards[currentIndex] ? cards[currentIndex].querySelector('.video-frame') : null;
    if (!activeVideo) return;

    const carouselRect = carousel.getBoundingClientRect();
    const videoRect = activeVideo.getBoundingClientRect();
    const arrowTop = videoRect.top - carouselRect.top + (videoRect.height / 2);

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
    if (!validateContactRequirement(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
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
    setHiddenValue('lead_source', section.dataset.leadSource || 'website_landing_page');

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
