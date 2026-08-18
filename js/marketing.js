// Keep vendor JavaScript out of the critical rendering path while preserving
// analytics queues from the beginning of the visit. Engagement starts the
// vendors immediately; passive visits fall back to an idle load after 8s.
(function () {
  const gtmId = 'GTM-T3PJRGP3';
  const metaPixelId = '3294200820778684';
  const fallbackDelayMs = 8000;
  let vendorsStarted = false;

  window.dataLayer = window.dataLayer || [];

  if (typeof window.fbq !== 'function') {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    fbq('init', metaPixelId);
    fbq('track', 'PageView');
  }

  const appendAsyncScript = (src, marker) => {
    if (document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.setAttribute(marker, '');
    document.head.appendChild(script);
  };

  const startVendors = () => {
    if (vendorsStarted) return;
    vendorsStarted = true;
    appendAsyncScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`, 'data-ateam-gtm');
    appendAsyncScript('https://connect.facebook.net/en_US/fbevents.js', 'data-ateam-meta-pixel');
  };

  const engagementEvents = ['pointerdown', 'keydown', 'touchstart'];
  engagementEvents.forEach((eventName) => {
    window.addEventListener(eventName, startVendors, { once: true, passive: true, capture: true });
  });

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(startVendors, { timeout: 2000 });
      } else {
        startVendors();
      }
    }, fallbackDelayMs);
  }, { once: true });

  window.ATeamMarketing = Object.assign(window.ATeamMarketing || {}, { loadNow: startVendors });
})();
