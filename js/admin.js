// Lightweight front-end gate for the mock admin experience.
// NOTE: This is not production-grade auth. Replace with real server-side auth, hashed passwords,
// and secure sessions before using with live data.
(function() {
  const SESSION_KEY = 'ateam_admin_session';
  const defaultAccount = { username: 'ateam', password: 'mckay', role: 'admin' };

  const readSession = () => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  };

  const writeSession = (payload) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };

  const redirectTo = (path) => {
    window.location.href = path;
  };

  const handleLogin = () => {
    const form = document.querySelector('[data-admin-login]');
    if (!form) return;

    const existing = readSession();
    if (existing) {
      redirectTo('/pages/admin-dashboard.html');
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const username = (formData.get('username') || '').toString().trim();
      const password = (formData.get('password') || '').toString();

      const isMatch = username === defaultAccount.username && password === defaultAccount.password;
      const feedback = form.querySelector('[data-feedback]');
      if (!isMatch) {
        if (feedback) {
          feedback.textContent = 'Invalid credentials. Please check the username and password.';
          feedback.hidden = false;
        }
        form.reset();
        return;
      }

      writeSession({ username, role: defaultAccount.role, loggedInAt: Date.now() });
      redirectTo('/pages/admin-dashboard.html');
    });
  };

  const applyGuards = () => {
    const requirement = document.body.dataset.requireAuth;
    if (!requirement) return;

    const session = readSession();
    if (!session) {
      redirectTo('/pages/admin-login.html');
      return;
    }

    if (requirement === 'admin' && session.role !== 'admin') {
      clearSession();
      redirectTo('/pages/admin-login.html');
      return;
    }

    const nameSlots = document.querySelectorAll('[data-admin-name]');
    nameSlots.forEach((slot) => {
      slot.textContent = session.username;
    });
  };

  const wireSignOut = () => {
    document.querySelectorAll('[data-sign-out]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        clearSession();
        redirectTo('/pages/admin-login.html');
      });
    });
  };

  const wireTabs = () => {
    const buttons = Array.from(document.querySelectorAll('[data-tab-target]'));
    const panels = Array.from(document.querySelectorAll('[data-tab-panel]'));
    if (!buttons.length || !panels.length) return;

    const setActive = (id) => {
      buttons.forEach((btn) => {
        const isActive = btn.getAttribute('data-tab-target') === id;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      panels.forEach((panel) => {
        const isActive = panel.getAttribute('data-tab-panel') === id;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const target = btn.getAttribute('data-tab-target');
        if (target) {
          setActive(target);
        }
      });
      btn.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const target = btn.getAttribute('data-tab-target');
          if (target) {
            setActive(target);
          }
        }
      });
    });

    setActive(buttons[0].getAttribute('data-tab-target'));
  };

  handleLogin();
  applyGuards();
  wireSignOut();
  wireTabs();
})();
