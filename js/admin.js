// Lightweight front-end gate for the mock admin experience.
// NOTE: This is not production-grade auth. Replace with real server-side auth, hashed passwords,
// and secure sessions before using with live data.
(function() {
  const SESSION_KEY = 'ateam_admin_session';
  const defaultAccount = { username: 'ateam', password: 'mckay', role: 'admin' };
  const DATA_STORE_KEY = 'ateam_data_overrides';
  const HISTORY_STORE_KEY = 'ateam_data_history';

  const readJson = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeJson = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* no-op */
    }
  };

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

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  const hydrateDataRows = () => {
    const overrides = readJson(DATA_STORE_KEY);
    const history = readJson(HISTORY_STORE_KEY);

    document.querySelectorAll('.data-row[data-id]').forEach((row) => {
      const id = row.dataset.id;
      const defaultValue = row.dataset.defaultValue || '';
      const value = overrides[id] && overrides[id].trim() ? overrides[id] : defaultValue;
      const valueEl = row.querySelector('[data-value]');
      if (valueEl) valueEl.textContent = value;

      const input = row.querySelector('[data-override-input]');
      if (input) input.value = overrides[id] || '';

      const nameEl = row.querySelector('[data-name]');
      if (nameEl) nameEl.setAttribute('role', 'button');

      // Merge default history into stored history
      const seededHistory = row.dataset.history ? row.dataset.history.split(';').filter(Boolean) : [];
      if (!history[id]) history[id] = [];
      seededHistory.forEach((entry) => {
        const [label, val] = entry.split('|');
        if (!val) return;
        const exists = history[id].some((h) => h.label === label && h.value === val);
        if (!exists) {
          history[id].push({ label, value: val });
        }
      });
    });

    writeJson(HISTORY_STORE_KEY, history);
  };

  const updateDataValue = (id, newValue) => {
    const overrides = readJson(DATA_STORE_KEY);
    const history = readJson(HISTORY_STORE_KEY);
    const timestamp = formatTimestamp(Date.now());

    if (newValue && newValue.trim()) {
      overrides[id] = newValue.trim();
      if (!history[id]) history[id] = [];
      history[id].push({ label: timestamp, value: newValue.trim(), type: 'override' });
    } else {
      delete overrides[id];
      if (!history[id]) history[id] = [];
      history[id].push({ label: `${timestamp} (cleared)`, value: 'Reverted to source', type: 'clear' });
    }

    writeJson(DATA_STORE_KEY, overrides);
    writeJson(HISTORY_STORE_KEY, history);

    document.querySelectorAll(`.data-row[data-id="${id}"]`).forEach((row) => {
      const defaultValue = row.dataset.defaultValue || '';
      const valueEl = row.querySelector('[data-value]');
      const displayVal = overrides[id] && overrides[id].trim() ? overrides[id] : defaultValue;
      if (valueEl) valueEl.textContent = displayVal;
      const input = row.querySelector('[data-override-input]');
      if (input && !newValue) input.value = '';
    });
    applyDataBindings();
  };

  const wireDataOverrides = () => {
    hydrateDataRows();

    document.querySelectorAll('[data-override-input]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const row = event.target.closest('.data-row');
        if (!row) return;
        const id = row.dataset.id;
        if (!id) return;
        updateDataValue(id, event.target.value);
      });
    });
  };

  const openModal = (contentEl) => {
    const modal = document.querySelector('[data-modal]');
    const modalBody = modal ? modal.querySelector('[data-modal-body]') : null;
    if (!modal || !modalBody) return;
    modalBody.innerHTML = '';
    modalBody.appendChild(contentEl);
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    const modal = document.querySelector('[data-modal]');
    const modalBody = modal ? modal.querySelector('[data-modal-body]') : null;
    if (!modal || !modalBody) return;
    modalBody.innerHTML = '';
    modal.setAttribute('hidden', 'true');
    modal.setAttribute('aria-hidden', 'true');
  };

  const renderHistoryModal = (id, title, references) => {
    const history = readJson(HISTORY_STORE_KEY);
    const defaultEntries = history[id] || [];
    const container = document.createElement('div');
    container.className = 'history-wrapper';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const sub = document.createElement('p');
    sub.textContent = 'Historical values and where this data point is used.';
    container.appendChild(heading);
    container.appendChild(sub);

    const historyList = document.createElement('div');
    historyList.className = 'history-list';
    if (defaultEntries.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No history yet.';
      historyList.appendChild(empty);
    } else {
      defaultEntries.slice().reverse().forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'history-row';
        const label = document.createElement('span');
        label.textContent = entry.label;
        const val = document.createElement('strong');
        val.textContent = entry.value;
        row.appendChild(label);
        row.appendChild(val);
        historyList.appendChild(row);
      });
    }

    const refsWrap = document.createElement('div');
    refsWrap.className = 'history-refs';
    const refsTitle = document.createElement('h4');
    refsTitle.textContent = 'Referenced in:';
    refsWrap.appendChild(refsTitle);
    if (references && references.length) {
      const list = document.createElement('ul');
      references.forEach((ref) => {
        const li = document.createElement('li');
        li.textContent = ref;
        list.appendChild(li);
      });
      refsWrap.appendChild(list);
    } else {
      const none = document.createElement('p');
      none.textContent = 'No references listed.';
      refsWrap.appendChild(none);
    }

    container.appendChild(historyList);
    container.appendChild(refsWrap);

    openModal(container);
  };

  const applyDataBindings = () => {
    const overrides = readJson(DATA_STORE_KEY);
    document.querySelectorAll('[data-source-id]').forEach((el) => {
      const id = el.dataset.sourceId;
      const fallback = el.dataset.defaultValue || '';
      if (!id) return;
      const overrideVal = overrides[id];
      const value = overrideVal && overrideVal.trim() ? overrideVal.trim() : fallback;
      el.textContent = value;
    });
  };

  const wireDataHistory = () => {
    const modal = document.querySelector('[data-modal]');
    if (!modal) return;

    modal.addEventListener('click', (event) => {
      if (event.target.dataset.closeModal !== undefined || event.target === modal) {
        closeModal();
      }
    });

    document.querySelectorAll('[data-name]').forEach((el) => {
      el.addEventListener('click', () => {
        const row = el.closest('.data-row');
        if (!row) return;
        const id = row.dataset.id;
        const title = el.textContent.trim();
        const refs = row.dataset.references ? row.dataset.references.split(';').filter(Boolean) : [];
        renderHistoryModal(id, title, refs);
      });
    });
  };

  handleLogin();
  applyGuards();
  wireSignOut();
  wireTabs();
  wireDataOverrides();
  wireDataHistory();
  applyDataBindings();
})();
