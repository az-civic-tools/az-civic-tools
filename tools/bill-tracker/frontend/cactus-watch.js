/**
 * Cactus Watch — Arizona Bill Tracker Frontend
 *
 * Supports two modes:
 *   - Demo: reads static JSON from demo-data/ (client-side filtering)
 *   - Production: queries the live Cactus Watch API (server-side filtering)
 *
 * Tracking features (localStorage):
 *   - Named bill lists (like Amazon wishlists)
 *   - Per-bill tracking type: RTS Comment / Vote Only / Watching
 *   - RTS comment drafts (cleared when bill status changes)
 *   - Status change detection with attention alerts
 */

(function () {
  'use strict';

  /* ============================================================
     Configuration & Constants
     ============================================================ */

  const LIVE_API = 'https://api.cactus.watch';
  const AUTH_API = 'https://auth.cactus.watch';
  const DEMO_DATA_PATH = 'demo-data';
  const PAGE_SIZE = 25;
  const STORAGE_KEY = 'cactus-watch-tracking';
  const USER_STORAGE_KEY = 'cactus-watch-user';

  const STATUS_LABELS = {
    introduced: 'Introduced', in_committee: 'In Committee',
    passed_committee: 'Passed Committee', on_floor: 'On Floor',
    passed_house: 'Passed House', passed_senate: 'Passed Senate',
    passed_both: 'Passed Both', to_governor: 'To Governor',
    signed: 'Signed', vetoed: 'Vetoed', dead: 'Dead', held: 'Held',
  };

  const TYPE_LABELS = {
    bill: 'Bill', memorial: 'Memorial', resolution: 'Resolution',
    concurrent_resolution: 'Concurrent Resolution', joint_resolution: 'Joint Resolution',
  };

  const COMMITTEE_ACTIONS = {
    DP: 'Do Pass', DPA: 'Do Pass, Amended', DPS: 'Do Pass, Substituted',
    DPAS: 'Do Pass, Amended & Substituted', PFC: 'Passed from Committee',
    'C&P': 'Consent & Pass', 'W/D': 'Withdrawn',
    W: 'Withdrawn', H: 'Held', RP: 'Referred', PASSED: 'Passed', FAILED: 'Failed',
  };

  // Better display names for procedural committee_short codes
  const PROCEDURAL_NAMES = {
    ADCOW: 'Committee of the Whole',
    COW: 'Committee of the Whole',
    MISC: 'Floor Motion',
    RECON_3RD: 'Motion to Reconsider 3rd Read',
    RECON: 'Motion to Reconsider',
    '3RD_READ': 'Third Read',
    CAUCUS: 'Caucus',
  };

  const TRACK_TYPE_LABELS = {
    rts_comment: 'RTS Comment',
    vote_only: 'Vote Only',
    watching: 'Watching',
  };

  const POSITION_LABELS = {
    for: 'For',
    neutral: 'Neutral',
    against: 'Against',
  };

  const DEMO_NAMES = [
    'Sage Prescott', 'Quinn Sedona', 'Rio Verde', 'Luna Flagstaff',
    'Jade Tempe', 'Scout Chandler', 'Wren Yuma', 'Ember Tucson',
    'Kai Mesa', 'Harper Bisbee', 'Rowan Jerome', 'Finley Payson',
  ];

  /* ============================================================
     State
     ============================================================ */

  const state = {
    mode: 'production',
    apiBase: LIVE_API,
    demoDataPath: DEMO_DATA_PATH,
    demoBills: null,
    demoDetails: {},
    meta: null,
    currentPage: 1,
    activeTab: 'browse',
    filters: { search: '', chamber: '', status: '', type: '', hearing: false, sort: 'updated_at', order: 'desc' },
    billCache: {},  // number → bill data from list/API
    user: null,     // null = logged out, object = logged in
  };

  function isLoggedIn() { return state.user !== null; }

  /* ============================================================
     Tracking Data Layer (localStorage)
     ============================================================ */

  const tracking = {
    _data: null,

    load() {
      if (this._data) return this._data;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        this._data = raw ? JSON.parse(raw) : null;
      } catch { this._data = null; }

      if (!this._data) {
        this._data = this._createDefault();
        this.save();
      }
      return this._data;
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
      } catch (e) { console.error('Failed to save tracking data:', e); }
      this._scheduleSyncToServer();
    },

    _syncTimer: null,
    _syncInFlight: false,

    _scheduleSyncToServer() {
      if (!isLoggedIn()) return;
      if (this._syncTimer) clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => this._syncToServer(), 3000);
    },

    async _syncToServer() {
      if (this._syncInFlight || !this._data) return;
      this._syncInFlight = true;
      try {
        const resp = await fetch(`${state.apiBase}/api/user/tracking`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this._data),
        });
        if (!resp.ok) {
          console.warn('Server sync failed:', resp.status);
        }
      } catch (err) {
        console.warn('Server sync error (offline?):', err);
      } finally {
        this._syncInFlight = false;
      }
    },

    async loadFromServer() {
      try {
        const resp = await fetch(`${state.apiBase}/api/user/tracking`, {
          credentials: 'include',
        });
        if (!resp.ok) return;
        const result = await resp.json();
        if (result.data) {
          this._data = result.data;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
        }
      } catch (err) {
        console.warn('Failed to load tracking from server (offline?):', err);
      }
    },

    _createDefault() {
      const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      return { user: { name }, lists: {} };
    },

    getUser() { return this.load().user; },

    getLists() { return this.load().lists; },

    getListArray() {
      return Object.values(this.load().lists).sort((a, b) => a.created < b.created ? -1 : 1);
    },

    createList(name) {
      const id = 'list-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const data = this.load();
      data.lists[id] = { id, name, created: new Date().toISOString(), items: {} };
      this.save();
      return id;
    },

    deleteList(id) {
      const data = this.load();
      delete data.lists[id];
      this.save();
    },

    renameList(id, name) {
      const data = this.load();
      if (data.lists[id]) { data.lists[id].name = name; this.save(); }
    },

    addToList(listId, bill) {
      const data = this.load();
      const list = data.lists[listId];
      if (!list || list.items[bill.number]) return;

      list.items[bill.number] = {
        number: bill.number,
        addedAt: new Date().toISOString(),
        trackingType: 'rts_comment',
        position: null,
        notes: '',
        rtsComment: '',
        lastKnownStatus: bill.status,
        lastKnownAction: bill.last_action || '',
        needsAttention: false,
        statusChangedAt: null,
      };
      this.save();
    },

    removeFromList(listId, number) {
      const data = this.load();
      const list = data.lists[listId];
      if (list) { delete list.items[number]; this.save(); }
    },

    archiveItem(listId, number) {
      this.updateItem(listId, number, { archived: true });
    },

    unarchiveItem(listId, number) {
      this.updateItem(listId, number, { archived: false });
    },

    getBillActions(number) {
      const data = this.load();
      return (data.billActions && data.billActions[number]) || {};
    },

    setBillAction(number, stageId, actionType, value) {
      const data = this.load();
      if (!data.billActions) data.billActions = {};
      if (!data.billActions[number]) data.billActions[number] = {};
      if (!data.billActions[number][stageId]) data.billActions[number][stageId] = {};
      data.billActions[number][stageId][actionType] = value;
      data.billActions[number][stageId][actionType + '_date'] = value ? new Date().toISOString() : null;
      this.save();
    },

    getListsForBill(number) {
      const lists = this.load().lists;
      const result = [];
      for (const list of Object.values(lists)) {
        if (list.items[number]) result.push(list);
      }
      return result;
    },

    isTracked(number) {
      return this.getListsForBill(number).length > 0;
    },

    updateItem(listId, number, updates) {
      const data = this.load();
      const list = data.lists[listId];
      if (!list || !list.items[number]) return;
      Object.assign(list.items[number], updates);
      this.save();
    },

    /** Check all tracked bills against current data, flag when RTS re-submission needed */
    checkStatusChanges(billMap) {
      const data = this.load();
      let changed = false;
      for (const list of Object.values(data.lists)) {
        for (const item of Object.values(list.items)) {
          const current = billMap[item.number];
          if (!current) continue;

          // Detect status change (new committee, new chamber, etc.)
          if (current.status !== item.lastKnownStatus) {
            item.needsAttention = true;
            item.rtsNeeded = true;
            item.statusChangedAt = new Date().toISOString();
            item.lastKnownStatus = current.status;
            item.lastKnownAction = current.last_action || '';
            changed = true;
          }

          // Detect new last_action (committee movement even without status change)
          if (current.last_action && current.last_action !== item.lastKnownAction) {
            item.lastKnownAction = current.last_action;
            // If the action mentions a new committee or transmit, flag for RTS
            const actionLower = (current.last_action || '').toLowerCase();
            if (actionLower.includes('transmitted') || actionLower.includes('committee')) {
              item.needsAttention = true;
              item.rtsNeeded = true;
              item.statusChangedAt = new Date().toISOString();
            }
            changed = true;
          }
        }
      }
      if (changed) this.save();
    },

    getAttentionCount() {
      let count = 0;
      for (const list of Object.values(this.load().lists)) {
        for (const item of Object.values(list.items)) {
          if (item.needsAttention && !item.archived) count++;
        }
      }
      return count;
    },

    getTotalTracked() {
      const seen = new Set();
      for (const list of Object.values(this.load().lists)) {
        for (const num of Object.keys(list.items)) seen.add(num);
      }
      return seen.size;
    },

    /** Get hearing action for a specific agenda item */
    getHearingAction(agendaItemId) {
      const data = this.load();
      return (data.hearingActions && data.hearingActions[String(agendaItemId)]) || null;
    },

    /** Set hearing action (voted/commented/position) for a specific agenda item */
    setHearingAction(agendaItemId, updates) {
      const data = this.load();
      if (!data.hearingActions) data.hearingActions = {};
      const key = String(agendaItemId);
      const existing = data.hearingActions[key] || { loggedAt: new Date().toISOString() };
      data.hearingActions[key] = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      this.save();
    },

    /** Follow/unfollow an org list category */
    followOrgList(orgCode, category, follow) {
      const data = this.load();
      if (!data.followedOrgLists) data.followedOrgLists = {};
      if (!data.followedOrgLists[orgCode]) data.followedOrgLists[orgCode] = {};
      data.followedOrgLists[orgCode][category] = follow;
      this.save();
    },

    isOrgListFollowed(orgCode, category) {
      const data = this.load();
      return !!(data.followedOrgLists && data.followedOrgLists[orgCode] && data.followedOrgLists[orgCode][category]);
    },

    getFollowedOrgLists() {
      return this.load().followedOrgLists || {};
    },

    /** Check if any hearing action exists for an agenda item */
    hasHearingAction(agendaItemId) {
      const action = this.getHearingAction(agendaItemId);
      return action && (action.voted || action.commented);
    },
  };

  /* ============================================================
     Initialization
     ============================================================ */

  function detectMode() {
    const scriptEl = document.querySelector('script[src*="cactus-watch"]');
    const dataApi = scriptEl?.getAttribute('data-api');
    if (dataApi) { state.mode = 'production'; state.apiBase = dataApi; return; }

    const params = new URLSearchParams(window.location.search);
    if (params.has('demo')) { state.mode = 'demo'; return; }

    const host = window.location.hostname;
    if (host.endsWith('github.io') || host === '' || host === 'localhost' || host === '127.0.0.1') {
      state.mode = 'demo';
      return;
    }
    state.mode = 'production';
  }

  async function init() {
    // Handle /auth/callback — session cookie is already set by auth service,
    // just verify the session and redirect to clean URL
    if (await handleAuthCallback()) return;

    detectMode();
    if (state.mode === 'demo') document.getElementById('bt-demo-banner').hidden = false;

    // Check auth state via session cookie
    await checkAuthState();

    if (isLoggedIn()) {
      await tracking.loadFromServer();
      tracking.load();
    }
    renderUserBadge();
    bindEvents();
    initFeedback();
    await loadMeta();
    await loadBills();
    updateListsBadge();
  }

  /* ============================================================
     Authentication
     ============================================================ */

  /**
   * Handle the /auth/callback redirect. The auth service already set a
   * session cookie on .cactus.watch during the OAuth/magic-link flow,
   * so we just verify the session is valid and redirect to /.
   *
   * @returns {Promise<boolean>} true if we handled a callback (page will redirect)
   */
  async function handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    // Check for auth error
    if (params.has('error') && (path === '/auth/callback' || params.has('code'))) {
      console.warn('Auth error:', params.get('error'));
      window.location.replace('/');
      return true;
    }

    // Only handle callback if we have a code parameter on the callback path
    if (path !== '/auth/callback' && !params.has('code')) return false;
    if (!params.has('code')) return false;

    try {
      const resp = await fetch(`${AUTH_API}/api/me`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.authenticated && data.user) {
          // Persist display info in localStorage (not the session token)
          const userInfo = {
            id: data.user.id,
            name: data.user.name || data.user.email,
            email: data.user.email,
            avatar_url: data.user.avatar_url || null,
          };
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
        }
      }
    } catch (err) {
      console.warn('Auth verification during callback failed:', err);
    }

    // Redirect to clean URL regardless — if session is invalid, user just sees logged-out state
    window.location.replace('/');
    return true;
  }

  /**
   * Check if the user has an active session by calling /api/me.
   * Falls back gracefully — if the call fails, user is simply logged out.
   */
  async function checkAuthState() {
    // First, try cached user info for instant UI render
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        state.user = JSON.parse(cached);
      }
    } catch { /* ignore corrupted cache */ }

    // Then verify with the auth server (non-blocking for UI if cached)
    try {
      const resp = await fetch(`${AUTH_API}/api/me`, { credentials: 'include' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.authenticated && data.user) {
          const userInfo = {
            id: data.user.id,
            name: data.user.name || data.user.email,
            email: data.user.email,
            avatar_url: data.user.avatar_url || null,
          };
          state.user = userInfo;
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
          return;
        }
      }
      // Session invalid or expired — clear cached user
      state.user = null;
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (err) {
      // Network error — keep cached user if available (offline-friendly)
      console.warn('Auth check failed:', err);
    }
  }

  /**
   * Log the user out — immediate UI update, then fire-and-forget API call.
   */
  function logout() {
    // Immediate UI update — don't wait for the API call
    state.user = null;
    localStorage.removeItem(USER_STORAGE_KEY);
    renderUserBadge();
    updateListsBadge();

    // Re-render bill list to hide add-to-list buttons
    const cachedBills = Object.values(state.billCache);
    if (cachedBills.length > 0) renderBillList(cachedBills.slice(0, PAGE_SIZE));

    // If on My Lists tab, switch to browse
    if (state.activeTab === 'lists') {
      switchTab('browse');
    }

    // Fire-and-forget: destroy server session
    fetch(`${AUTH_API}/api/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch((err) => console.warn('Logout API call failed:', err));
  }

  /* ============================================================
     Data Layer
     ============================================================ */

  async function fetchJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
    return resp.json();
  }

  async function loadMeta() {
    try {
      state.meta = state.mode === 'demo'
        ? await fetchJSON(`${state.demoDataPath}/meta.json`)
        : await fetchJSON(`${state.apiBase}/api/meta`);
      renderMeta();
    } catch (err) { console.error('Failed to load metadata:', err); }
  }

  async function loadBills() {
    showLoading(true);
    try {
      const result = state.mode === 'demo' ? await loadDemoBills() : await loadApiBills();

      // Cache bills for status change checks
      for (const b of result.bills) state.billCache[b.number] = b;
      if (isLoggedIn()) tracking.checkStatusChanges(state.billCache);

      renderBillList(result.bills);
      renderPagination(result.pagination);
      renderResultsBar(result.pagination.total);
      updateListsBadge();
    } catch (err) {
      console.error('Failed to load bills:', err);
      renderError('Failed to load bills. Please try again.');
    } finally { showLoading(false); }
  }

  async function loadApiBills() {
    const params = new URLSearchParams();
    params.set('page', state.currentPage);
    params.set('limit', PAGE_SIZE);
    const { search, chamber, status, type, sort, order, hearing } = state.filters;
    if (search) params.set('search', search);
    if (chamber) params.set('chamber', chamber);
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (hearing) params.set('hearing', '1');
    if (sort) params.set('sort', sort);
    params.set('order', order);
    return fetchJSON(`${state.apiBase}/api/bills?${params}`);
  }

  async function loadDemoBills() {
    if (!state.demoBills) {
      const data = await fetchJSON(`${state.demoDataPath}/bills.json`);
      state.demoBills = data.bills;
    }
    let filtered = [...state.demoBills];
    const { search, chamber, status, type, sort, order } = state.filters;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.number.toLowerCase().includes(q) ||
        (b.short_title || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.sponsor || '').toLowerCase().includes(q)
      );
    }
    if (chamber) filtered = filtered.filter(b => b.chamber === chamber);
    if (status) filtered = filtered.filter(b => b.status === status);
    if (type) filtered = filtered.filter(b => b.bill_type === type);

    const dir = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const va = (a[sort] || '').toString().toLowerCase();
      const vb = (b[sort] || '').toString().toLowerCase();
      return va < vb ? -dir : va > vb ? dir : 0;
    });

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(state.currentPage, pages);
    const start = (page - 1) * PAGE_SIZE;
    return { bills: filtered.slice(start, start + PAGE_SIZE), pagination: { page, limit: PAGE_SIZE, total, pages } };
  }

  async function loadBillDetail(number) {
    if (state.mode === 'demo') {
      if (state.demoDetails[number]) return state.demoDetails[number];
      try {
        const detail = await fetchJSON(`${state.demoDataPath}/bills/${number}.json`);
        state.demoDetails[number] = detail;
        return detail;
      } catch { return state.demoBills?.find(b => b.number === number) || null; }
    }
    return fetchJSON(`${state.apiBase}/api/bills/${number}`);
  }

  /* ============================================================
     Rendering — Helpers
     ============================================================ */

  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  }

  /** Check if a hearing's start time has passed in AZ time (America/Phoenix, UTC-7 year-round) */
  function isHearingPast(dateStr, timeStr) {
    if (!dateStr) return false;
    try {
      // Parse the date (e.g. "3/16/2026")
      const dateParts = dateStr.match(/(\d+)\/(\d+)\/(\d+)/);
      if (!dateParts) return false;
      const [, month, day, year] = dateParts;

      // Parse time (e.g. "1:00 P.M." or "2:00 P.M. or upon recess...")
      let hours = 23, minutes = 59; // default to end of day if no time
      if (timeStr) {
        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(A\.?M\.?|P\.?M\.?)/i);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
          const isPM = timeMatch[3].replace(/\./g, '').toUpperCase() === 'PM';
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
      }

      // Build AZ date (UTC-7)
      const hearingUtc = new Date(Date.UTC(
        parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10),
        hours + 7, minutes
      ));
      return Date.now() > hearingUtc.getTime();
    } catch { return false; }
  }

  /** Render org recommendation badges */
  function renderOrgBadges(recommendations) {
    if (!recommendations?.length) return '';
    return recommendations.map(r => {
      const posClass = r.position === 'oppose' ? 'bt-hearing-org-rec--oppose' : 'bt-hearing-org-rec--support';
      const label = r.position === 'oppose' ? 'OPPOSE' : 'SUPPORT';
      return `<a href="${esc(r.source_url)}" target="_blank" rel="noopener" class="bt-hearing-org-rec ${posClass}" title="${esc(r.org_name)}: ${label} — ${esc(r.category || '')}">${esc(r.org_code)}: ${label}</a>`;
    }).join('');
  }

  function statusLabel(s) { return STATUS_LABELS[s] || s; }
  function typeLabel(t) { return TYPE_LABELS[t] || t; }
  function actionLabel(a) { return COMMITTEE_ACTIONS[a] || a; }
  function committeeName(ca) { return PROCEDURAL_NAMES[ca.committee_short] || ca.committee_name; }

  /* ============================================================
     Rendering — Header & Meta
     ============================================================ */

  function renderUserBadge() {
    const el = document.getElementById('bt-user-badge');
    if (!isLoggedIn()) {
      el.innerHTML = `<button class="bt-btn bt-btn--login" id="bt-login-btn">Sign In</button>`;
      return;
    }
    const displayName = state.user.name || state.user.email || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    el.innerHTML = [
      `<span class="bt-user-avatar">${initial}</span>`,
      `<span class="bt-user-name">${esc(displayName)}</span>`,
      `<button class="bt-logout-link" id="bt-logout-btn" aria-label="Sign out">Sign out</button>`,
    ].join('');
  }

  function renderMeta() {
    const el = document.getElementById('bt-meta-stats');
    if (!state.meta?.bills) { el.innerHTML = ''; return; }
    const { total, by_status } = state.meta.bills;
    const signed = by_status?.signed || 0;
    const vetoed = by_status?.vetoed || 0;
    const active = total - (signed + vetoed + (by_status?.dead || 0));
    el.innerHTML = `
      <div class="bt-meta-stat"><span class="bt-meta-stat-value">${total.toLocaleString()}</span><span class="bt-meta-stat-label">Total Bills</span></div>
      <div class="bt-meta-stat"><span class="bt-meta-stat-value">${active.toLocaleString()}</span><span class="bt-meta-stat-label">Active</span></div>
      <div class="bt-meta-stat"><span class="bt-meta-stat-value">${signed}</span><span class="bt-meta-stat-label">Signed</span></div>
      <div class="bt-meta-stat"><span class="bt-meta-stat-value">${vetoed}</span><span class="bt-meta-stat-label">Vetoed</span></div>
    `;
  }

  function updateListsBadge() {
    const listsTab = document.querySelector('[data-tab="lists"]');
    if (!isLoggedIn()) {
      listsTab.hidden = true;
      return;
    }
    listsTab.hidden = false;
    const badge = document.getElementById('bt-lists-badge');
    const attention = tracking.getAttentionCount();
    const total = tracking.getTotalTracked();
    if (total === 0) { badge.hidden = true; return; }
    badge.hidden = false;
    badge.textContent = attention > 0 ? attention : total;
    badge.className = `bt-nav-badge${attention > 0 ? ' bt-nav-badge--attention' : ''}`;
  }

  /* ============================================================
     Rendering — Bill List
     ============================================================ */

  function renderBillList(bills) {
    const el = document.getElementById('bt-bill-list');
    if (!bills || bills.length === 0) {
      el.innerHTML = `<div class="bt-empty"><div class="bt-empty-icon">&#127797;</div><div class="bt-empty-text">No bills found</div><div class="bt-empty-sub">Try adjusting your filters or search terms</div></div>`;
      return;
    }
    el.innerHTML = bills.map((bill, i) => {
      const isTracked = isLoggedIn() && tracking.isTracked(bill.number);
      return `
      <article class="bt-bill-card" style="animation-delay: ${Math.min(i * 30, 400)}ms" tabindex="0" role="button" aria-label="View ${esc(bill.number)}">
        <div class="bt-card-number">${esc(bill.number)}</div>
        <div class="bt-card-title">${esc(bill.short_title || bill.description || 'No title')}</div>
        <div class="bt-card-meta">
          <span class="bt-chamber">${bill.chamber === 'H' ? 'House' : 'Senate'}</span>
          ${bill.sponsor ? `<span><span class="bt-party bt-party--${esc(bill.sponsor_party)}"></span>${esc(bill.sponsor)}</span>` : ''}
          ${bill.last_action_date ? `<span>${formatDate(bill.last_action_date)}</span>` : ''}
        </div>
        <div class="bt-card-actions">
          ${bill.has_hearing ? '<span class="bt-hearing-badge">Hearing</span>' : ''}
          <span class="bt-status bt-status--${esc(bill.status)}">${statusLabel(bill.status)}</span>
          ${isLoggedIn() ? `<button class="bt-card-add ${isTracked ? 'bt-card-add--tracked' : ''}" data-number="${esc(bill.number)}" aria-label="Add ${esc(bill.number)} to list" title="${isTracked ? 'On a list' : 'Add to list'}">
            ${isTracked ? '&#10003;' : '+'}
          </button>` : ''}
        </div>
      </article>`;
    }).join('');
  }

  function renderPagination(pagination) {
    const el = document.getElementById('bt-pagination');
    if (!pagination || pagination.pages <= 1) { el.innerHTML = ''; return; }
    const { page, pages } = pagination;
    let html = `<button class="bt-page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">&laquo;</button>`;
    for (const p of buildPageRange(page, pages)) {
      html += p === '...'
        ? `<span class="bt-page-ellipsis">&hellip;</span>`
        : `<button class="bt-page-btn ${p === page ? 'bt-page-btn--active' : ''}" data-page="${p}">${p}</button>`;
    }
    html += `<button class="bt-page-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">&raquo;</button>`;
    el.innerHTML = html;
  }

  function buildPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  function renderResultsBar(total) {
    const el = document.getElementById('bt-results-bar');
    const hasFilters = state.filters.search || state.filters.chamber || state.filters.status || state.filters.type || state.filters.hearing;
    el.innerHTML = `
      <span><span class="bt-results-count">${total.toLocaleString()}</span> bill${total !== 1 ? 's' : ''} found</span>
      ${hasFilters ? `<button class="bt-results-clear" id="bt-clear-filters">Clear filters</button>` : ''}
    `;
  }

  /* ============================================================
     Rendering — Bill Detail
     ============================================================ */

  function renderBillDetail(bill) {
    const body = document.getElementById('bt-detail-body');
    if (!bill) { body.innerHTML = '<p>Bill not found.</p>'; return; }

    // Cache for tracking
    state.billCache[bill.number] = bill;

    const listsForBill = isLoggedIn() ? tracking.getListsForBill(bill.number) : [];
    const isTracked = listsForBill.length > 0;

    let html = `
      <div class="bt-detail-header">
        <div class="bt-detail-number">${esc(bill.number)}</div>
        <span class="bt-status bt-status--${esc(bill.status)}">${statusLabel(bill.status)}</span>
        ${bill.short_title ? `<div class="bt-detail-title">${esc(bill.short_title)}</div>` : ''}
        ${bill.description ? `<div class="bt-detail-description">${esc(bill.description)}</div>` : ''}
        <dl class="bt-detail-meta">
          ${bill.sponsor ? `<div><dt>Sponsor</dt><dd><span class="bt-party bt-party--${esc(bill.sponsor_party)}"></span>${esc(bill.sponsor)}</dd></div>` : ''}
          <div><dt>Chamber</dt><dd>${bill.chamber === 'H' ? 'House' : 'Senate'}</dd></div>
          <div><dt>Type</dt><dd>${typeLabel(bill.bill_type)}</dd></div>
          ${bill.date_introduced ? `<div><dt>Introduced</dt><dd>${formatDate(bill.date_introduced)}</dd></div>` : ''}
          ${bill.last_action ? `<div><dt>Last Action</dt><dd>${esc(bill.last_action)} (${formatDate(bill.last_action_date)})</dd></div>` : ''}
          ${bill.governor_action ? `<div><dt>Governor</dt><dd>${esc(bill.governor_action)} (${formatDate(bill.governor_action_date)})</dd></div>` : ''}
        </dl>
        ${bill.org_recommendations?.length ? `<div class="bt-detail-org-recs" style="margin-top: 10px;">${renderOrgBadges(bill.org_recommendations)}</div>` : ''}
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
          ${bill.azleg_url ? `<a href="${esc(bill.azleg_url)}" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-detail-azleg">&#127963; View on AZLeg.gov &rarr;</a>` : ''}
          ${isLoggedIn() ? `<button class="bt-btn bt-btn--small bt-detail-add-btn" data-number="${esc(bill.number)}">${isTracked ? '&#10003; On list' : '+ Add to list'}</button>` : ''}
        </div>
      </div>
    `;

    // Tracking section (if on a list)
    if (isTracked) {
      html += renderDetailTracking(bill, listsForBill);
    }

    // Cosponsors
    if (bill.cosponsors?.length) {
      html += `<div class="bt-detail-section"><h3 class="bt-detail-section-title">Cosponsors (${bill.cosponsors.length})</h3><ul class="bt-cosponsor-list">${bill.cosponsors.map(c => `<li class="bt-cosponsor"><span class="bt-party bt-party--${esc(c.party)}"></span>${esc(c.name)}</li>`).join('')}</ul></div>`;
    }

    // Committee actions
    if (bill.committee_actions?.length) {
      html += `<div class="bt-detail-section"><h3 class="bt-detail-section-title">Committee Actions</h3><ul class="bt-committee-list">${bill.committee_actions.map(ca => `
        <li class="bt-committee-item"><div class="bt-committee-name">${esc(ca.committee_name)}</div><div class="bt-committee-detail">${ca.action ? `<strong>${actionLabel(ca.action)}</strong>` : ''}${(ca.ayes != null && ca.nays != null) ? ` — ${ca.ayes} ayes, ${ca.nays} nays` : ''}${ca.action_date ? ` &middot; ${formatDate(ca.action_date)}` : ''}</div></li>
      `).join('')}</ul></div>`;
    }

    // Floor votes
    if (bill.votes?.length) {
      html += `<div class="bt-detail-section"><h3 class="bt-detail-section-title">Floor Votes</h3>${bill.votes.map((v, vi) => renderVote(v, vi)).join('')}</div>`;
    }

    // RTS Agendas — show for ALL bills, not just tracked
    if (bill.rts_agendas?.length) {
      html += renderRtsAgendasSection(bill.rts_agendas, bill.number);
    } else if (!bill.rts_agendas) {
      // Bill detail from API didn't include rts_agendas (demo mode or old cache) — async fallback
      html += `<div class="bt-rts-agendas" id="bt-rts-agendas" data-bill="${esc(bill.number)}"></div>`;
    }

    body.innerHTML = html;
    bindDetailEvents(body, bill);

    // Async fallback for demo mode or when rts_agendas not in response
    if (!bill.rts_agendas && isLoggedIn() && tracking.isTracked(bill.number)) {
      loadRtsAgendas(bill.number);
    }
  }

  function renderDetailTracking(bill, lists) {
    // Use first list's item for tracking info
    const firstList = lists[0];
    const item = firstList.items[bill.number];
    const listNames = lists.map(l => l.name).join(', ');
    const userActions = tracking.getBillActions(bill.number);

    const customLabel = item.customLabel || bill.short_title || bill.description || '';

    let html = `<div class="bt-detail-tracking">
      <div class="bt-detail-tracking-header">
        <span class="bt-detail-tracking-title">&#128204; Tracking</span>
        <input type="text" class="bt-tracking-label-input" id="bt-tracking-label" data-list="${firstList.id}" data-number="${bill.number}" value="${esc(customLabel)}" placeholder="Bill label..." maxlength="80">
      </div>
      <div class="bt-detail-tracking-lists">On: <strong>${esc(listNames)}</strong></div>`;

    // Status change alert
    if (item.needsAttention) {
      html += `<div class="bt-status-alert"><span class="bt-status-alert-icon">&#9888;&#65039;</span>Status changed to <strong>${statusLabel(bill.status)}</strong> — re-submit your RTS comment on azleg.gov</div>`;
    }

    // Position selector (For / Neutral / Against)
    // Check if any hearing action has "voted" set for this bill's agendas
    const billAgendas = bill.rts_agendas || [];
    const hasSubmitted = billAgendas.some(a => tracking.getHearingAction(a.agenda_item_id)?.voted);

    html += `<div class="bt-position-row">
      <span class="bt-position-label">My Position:</span>
      <div class="bt-position-selector">
        ${Object.entries(POSITION_LABELS).map(([key, label]) =>
          `<button class="bt-position-btn bt-position-btn--${key} ${item.position === key ? 'bt-position-btn--active' : ''}" data-position="${key}" data-list="${firstList.id}" data-number="${bill.number}">${label}</button>`
        ).join('')}
      </div>
    </div>
    <div class="bt-submit-position-row">
      <button class="bt-btn bt-btn--small bt-submit-position-btn" data-number="${esc(bill.number)}">&#128483; Submit Position on AZLeg.gov</button>
      <label class="bt-hearing-action-check">
        <input type="checkbox" class="bt-detail-submitted-cb" data-number="${esc(bill.number)}" ${hasSubmitted ? 'checked' : ''}>
        <span>I submitted my position</span>
      </label>
    </div>`;

    // Position note + divider before RTS Comment
    html += `<div class="bt-tracking-divider"></div>
    <div class="bt-tracking-note">Your position (For / Neutral / Against) only needs to be set once — it is saved throughout the bill's life. Your RTS comment below must be re-submitted each time the bill moves to a new committee or chamber.</div>`;

    // RTS Comment area (always visible for tracked bills)
    {
      const charCount = (item.rtsComment || '').length;
      const charClass = charCount > 250 ? 'bt-rts-counter--over' : charCount > 200 ? 'bt-rts-counter--warn' : '';
      html += `<div class="bt-rts-section">
        <div class="bt-rts-label-row">
          <div class="bt-rts-label">My RTS Comment</div>
          <button class="bt-btn bt-btn--small bt-rts-copy-btn" id="bt-rts-copy" title="Copy to clipboard">&#128203; Copy</button>
        </div>
        <textarea class="bt-rts-textarea" id="bt-rts-textarea" data-list="${firstList.id}" data-number="${bill.number}" maxlength="250" placeholder="Write your Request to Speak comment here (250 char limit)...">${esc(item.rtsComment)}</textarea>
        <div class="bt-rts-footer">
          <div class="bt-rts-hint">AZLeg clears your RTS comment at each stage — save it here so you can copy &amp; paste it each time.</div>
          <div class="bt-rts-counter ${charClass}" id="bt-rts-counter">${charCount}/250</div>
        </div>
      </div>`;
    }

    // Notes area (always visible when tracked, no character limit)
    html += `<div class="bt-rts-section">
      <div class="bt-rts-label">My Notes</div>
      <textarea class="bt-notes-textarea" id="bt-notes-textarea" data-list="${firstList.id}" data-number="${bill.number}" placeholder="Personal notes — not cleared on status change...">${esc(item.notes || '')}</textarea>
    </div>`;

    // RTS Action History
    const historyEntries = buildActionHistory(bill, userActions);
    if (historyEntries.length > 0) {
      html += `<div class="bt-action-history">
        <div class="bt-action-history-title">My RTS History</div>
        ${historyEntries.map(entry => `<div class="bt-action-history-entry">
          <span class="bt-action-history-date">${entry.date}</span>
          <span class="bt-action-history-text">${esc(entry.text)}</span>
        </div>`).join('')}
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  /** Build action history entries from bill actions data */
  function buildActionHistory(bill, userActions) {
    const entries = [];
    const stages = buildTimelineStages(bill);

    for (const stage of stages) {
      if (stage.type === 'section') continue;
      const actions = userActions[stage.id];
      if (!actions) continue;

      if (actions.commented && actions.commented_date) {
        entries.push({
          date: formatDate(actions.commented_date),
          text: `RTS Comment Left — ${stage.label}`,
          timestamp: actions.commented_date,
        });
      }
    }

    // Sort newest first
    entries.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    return entries;
  }

  /* ============================================================
     Timeline — Bill Lifecycle
     ============================================================ */

  const FLOOR_ACTION_LABELS = {
    '1st_read': 'First Read',
    '2nd_read': 'Second Read',
    'cow': 'Committee of the Whole',
  };

  /** Add floor reading stages (1st read, 2nd read, COW) for a chamber */
  function addFloorReadings(stages, bill, chamber, prefix, chamberLabel, sectionId, passed) {
    const fa = (bill.floor_actions || []).filter(a => a.chamber === chamber);
    if (fa.length === 0 && !passed) return; // No data and not passed — skip (future stages only)

    for (const actionType of ['1st_read', '2nd_read', 'cow']) {
      const action = fa.find(a => a.action_type === actionType);
      if (action) {
        stages.push({
          id: `${prefix}-${actionType}`, type: 'floor_reading',
          label: `${chamberLabel} ${FLOOR_ACTION_LABELS[actionType]}`,
          sublabel: formatDate(action.action_date),
          phase: 'completed', section: sectionId,
          actionable: false,
        });
      } else if (!passed) {
        // Show as future if bill hasn't passed this chamber yet
        stages.push({
          id: `${prefix}-${actionType}`, type: 'floor_reading',
          label: `${chamberLabel} ${FLOOR_ACTION_LABELS[actionType]}`,
          phase: 'future', section: sectionId,
          actionable: false,
        });
      }
    }
  }

  /** Build an ordered array of timeline stages from bill data */
  function buildTimelineStages(bill) {
    const stages = [];
    const originCh = bill.chamber || (bill.number.startsWith('H') ? 'H' : 'S');
    const crossCh = originCh === 'H' ? 'S' : 'H';
    const originLabel = originCh === 'H' ? 'House' : 'Senate';
    const crossLabel = crossCh === 'H' ? 'House' : 'Senate';

    // Determine what has been passed based on status
    const passedOriginStatuses = originCh === 'H'
      ? ['passed_house', 'passed_both', 'to_governor', 'signed', 'vetoed']
      : ['passed_senate', 'passed_both', 'to_governor', 'signed', 'vetoed'];
    const passedOrigin = passedOriginStatuses.includes(bill.status);
    const passedCross = ['passed_both', 'to_governor', 'signed', 'vetoed'].includes(bill.status);
    const atGovernor = ['to_governor', 'signed', 'vetoed'].includes(bill.status);
    const isFinal = ['signed', 'vetoed'].includes(bill.status);
    const isDead = bill.status === 'dead' || bill.status === 'held';

    // Determine which section is "current" for auto-expand
    let currentSection = 'intro';
    if (['in_committee', 'passed_committee', 'on_floor'].includes(bill.status)) {
      currentSection = originCh === 'H' ? 'house' : 'senate';
    } else if (passedOrigin && !passedCross) {
      currentSection = crossCh === 'H' ? 'house' : 'senate';
    } else if (atGovernor || isFinal) {
      currentSection = 'governor';
    }

    // --- Introduction ---
    stages.push({
      id: 'introduced', type: 'milestone', label: 'Introduced',
      sublabel: bill.date_introduced ? formatDate(bill.date_introduced) : '',
      phase: 'completed', section: 'intro',
    });

    // --- Origin chamber ---
    const originSectionId = originCh === 'H' ? 'house' : 'senate';
    stages.push({ id: 'origin-header', type: 'section', label: originLabel, sectionId: originSectionId, phase: 'active' });

    const originCAs = (bill.committee_actions || []).filter(ca => ca.chamber === originCh);
    originCAs.forEach((ca, i) => {
      const acted = ca.action && ca.action !== 'None' && ca.action_date;
      stages.push({
        id: `origin-ca-${i}`, type: 'committee',
        label: committeeName(ca),
        sublabel: acted ? formatDate(ca.action_date) : '',
        detail: acted ? actionLabel(ca.action) : 'Pending',
        votes: (ca.ayes || ca.nays) ? `${ca.ayes}-${ca.nays}` : '',
        phase: acted ? 'completed' : (passedOrigin ? 'completed' : 'current'),
        actionable: true, section: originSectionId,
      });
    });

    // Origin floor actions (readings, COW)
    addFloorReadings(stages, bill, originCh, 'origin', originLabel, originSectionId, passedOrigin);

    // Origin floor votes (3rd reading)
    const originVotes = (bill.votes || []).filter(v => v.chamber === originCh);
    originVotes.forEach((v, i) => {
      const passed = v.result?.toLowerCase().includes('passed');
      stages.push({
        id: `origin-vote-${i}`, type: 'vote',
        label: `${originLabel} Third Read`,
        sublabel: formatDate(v.vote_date),
        detail: v.result,
        votes: `${v.yeas}-${v.nays}`,
        phase: 'completed',
        result: passed ? 'passed' : 'failed',
        actionable: true, section: originSectionId,
      });
    });

    // Future origin floor vote if not yet voted and not passed origin
    if (originVotes.length === 0 && !passedOrigin && !isDead) {
      stages.push({
        id: 'origin-vote-future', type: 'vote',
        label: `${originLabel} Third Read`,
        phase: bill.status === 'on_floor' ? 'current' : 'future',
        actionable: true, section: originSectionId,
      });
    }

    // --- Crossover ---
    stages.push({
      id: 'crossover', type: 'milestone', label: `Cross to ${crossLabel}`,
      phase: passedOrigin ? 'completed' : 'future', section: originSectionId,
    });

    // --- Cross chamber ---
    const crossSectionId = crossCh === 'H' ? 'house' : 'senate';
    if (passedOrigin) {
      stages.push({ id: 'cross-header', type: 'section', label: crossLabel, sectionId: crossSectionId, phase: 'active' });

      const crossCAs = (bill.committee_actions || []).filter(ca => ca.chamber === crossCh);
      if (crossCAs.length > 0) {
        crossCAs.forEach((ca, i) => {
          const acted = ca.action && ca.action !== 'None' && ca.action_date;
          stages.push({
            id: `cross-ca-${i}`, type: 'committee',
            label: committeeName(ca),
            sublabel: acted ? formatDate(ca.action_date) : '',
            detail: acted ? actionLabel(ca.action) : 'Pending',
            votes: (ca.ayes || ca.nays) ? `${ca.ayes}-${ca.nays}` : '',
            phase: acted ? 'completed' : (passedCross ? 'completed' : 'current'),
            actionable: true, section: crossSectionId,
          });
        });
      } else if (!passedCross) {
        stages.push({
          id: 'cross-ca-future', type: 'committee',
          label: 'Awaiting committee assignment',
          phase: 'current',
          actionable: false, section: crossSectionId,
        });
      }

      // Cross floor actions (readings, COW)
      addFloorReadings(stages, bill, crossCh, 'cross', crossLabel, crossSectionId, passedCross);

      const crossVotes = (bill.votes || []).filter(v => v.chamber === crossCh);
      crossVotes.forEach((v, i) => {
        const passed = v.result?.toLowerCase().includes('passed');
        stages.push({
          id: `cross-vote-${i}`, type: 'vote',
          label: `${crossLabel} Third Read`,
          sublabel: formatDate(v.vote_date),
          detail: v.result,
          votes: `${v.yeas}-${v.nays}`,
          phase: 'completed',
          result: passed ? 'passed' : 'failed',
          actionable: true, section: crossSectionId,
        });
      });

      if (crossVotes.length === 0 && !passedCross) {
        stages.push({
          id: 'cross-vote-future', type: 'vote',
          label: `${crossLabel} Third Read`,
          phase: 'future',
          actionable: true, section: crossSectionId,
        });
      }
    } else if (!isDead) {
      stages.push({ id: 'cross-header', type: 'section', label: crossLabel, sectionId: crossSectionId, phase: 'future' });
      stages.push({ id: 'cross-ca-future', type: 'committee', label: `${crossLabel} Committee Assignment`, phase: 'future', actionable: false, section: crossSectionId });
      stages.push({ id: 'cross-vote-future', type: 'vote', label: `${crossLabel} Third Read`, phase: 'future', actionable: false, section: crossSectionId });
    }

    // --- Governor ---
    stages.push({ id: 'governor-header', type: 'section', label: 'Governor', sectionId: 'governor', phase: atGovernor || isFinal ? 'active' : 'future' });
    if (bill.governor_action) {
      const signed = bill.status === 'signed';
      stages.push({
        id: 'governor', type: 'governor', label: 'Governor',
        sublabel: formatDate(bill.governor_action_date),
        detail: bill.governor_action,
        phase: 'completed',
        result: signed ? 'signed' : 'vetoed',
        section: 'governor',
      });
    } else if (!isDead) {
      stages.push({
        id: 'governor', type: 'governor', label: 'Governor',
        phase: atGovernor ? 'current' : 'future',
        section: 'governor',
      });
    }

    // --- Dead / Held marker ---
    if (isDead) {
      stages.push({
        id: 'dead', type: 'dead', label: bill.status === 'held' ? 'Held' : 'Dead',
        phase: 'dead', section: 'governor',
      });
    }

    // Store currentSection on the result for the renderer
    stages.currentSection = currentSection;

    return stages;
  }

  // Track which timeline sections are manually toggled
  const timelineSectionState = {};

  /** Render the timeline panel */
  function renderTimeline(bill) {
    const panel = document.getElementById('bt-timeline-body');
    const stages = buildTimelineStages(bill);
    const currentSection = stages.currentSection || 'intro';
    const isTracked = tracking.isTracked(bill.number);
    const userActions = tracking.getBillActions(bill.number);

    // Determine tracking type & position
    let trackingType = null;
    let position = null;
    if (isTracked) {
      const lists = tracking.getListsForBill(bill.number);
      const item = lists[0]?.items[bill.number];
      trackingType = item?.trackingType;
      position = item?.position;
    }

    let html = `<div class="bt-tl-header">
      <div class="bt-tl-bill-number">${esc(bill.number)}</div>
      <div class="bt-tl-heading">Bill Lifecycle</div>
      ${position ? `<div class="bt-tl-position bt-tl-position--${position}">${POSITION_LABELS[position]}</div>` : ''}
    </div>`;

    // Group stages by section
    const sections = [];
    let currentGroup = null;
    for (const stage of stages) {
      if (stage.type === 'section') {
        currentGroup = { header: stage, stages: [] };
        sections.push(currentGroup);
      } else if (currentGroup) {
        currentGroup.stages.push(stage);
      }
    }

    // The "Introduced" milestone has no section header, handle it
    const introStage = stages.find(s => s.id === 'introduced');
    if (introStage && (sections.length === 0 || sections[0].header.sectionId !== 'intro')) {
      // Insert intro section at beginning if not there
      const introSection = sections.find(s => s.header.sectionId === 'intro');
      if (!introSection) {
        sections.unshift({ header: { label: 'Introduced', sectionId: 'intro', phase: 'completed' }, stages: [introStage] });
      }
    }

    const allNodeStages = stages.filter(s => s.type !== 'section');

    for (const group of sections) {
      const sectionId = group.header.sectionId;
      const isFutureSection = group.header.phase === 'future';

      // Determine if section should be expanded
      const isCurrentSection = sectionId === currentSection;
      // Manual override in timelineSectionState, otherwise auto-expand current section
      const isExpanded = timelineSectionState[bill.number + '-' + sectionId] !== undefined
        ? timelineSectionState[bill.number + '-' + sectionId]
        : isCurrentSection;

      // Section summary for collapsed view
      const completedCount = group.stages.filter(s => s.phase === 'completed').length;
      const totalCount = group.stages.length;
      const hasCurrentStage = group.stages.some(s => s.phase === 'current');
      const summaryText = isFutureSection ? '' : `${completedCount}/${totalCount} complete`;

      html += `<div class="bt-tl-group ${isFutureSection ? 'bt-tl-group--future' : ''} ${isExpanded ? 'bt-tl-group--expanded' : ''}">
        <div class="bt-tl-group-header" data-section="${sectionId}" data-bill="${esc(bill.number)}" role="button" tabindex="0">
          <span class="bt-tl-group-chevron">${isExpanded ? '&#9660;' : '&#9654;'}</span>
          <span class="bt-tl-group-label">${esc(group.header.label)}</span>
          ${hasCurrentStage ? '<span class="bt-tl-group-current">Current</span>' : ''}
          ${summaryText ? `<span class="bt-tl-group-summary">${summaryText}</span>` : ''}
        </div>`;

      if (isExpanded) {
        html += '<div class="bt-tl-group-body">';
        group.stages.forEach((stage, gi) => {
          const globalIndex = allNodeStages.indexOf(stage);
          const isFirst = globalIndex === 0;
          const isLast = globalIndex === allNodeStages.length - 1;
          const phaseClass = `bt-tl--${stage.phase}`;
          const typeClass = `bt-tl-stage--${stage.type}`;

          let markerIcon;
          if (stage.phase === 'dead') markerIcon = '&#10007;';
          else if (stage.phase === 'completed') markerIcon = '&#10003;';
          else if (stage.phase === 'current') markerIcon = '&#9679;';
          else markerIcon = '';

          let resultBadge = '';
          if (stage.result === 'failed') resultBadge = '<span class="bt-tl-result bt-tl-result--failed">Failed</span>';
          else if (stage.result === 'vetoed') resultBadge = '<span class="bt-tl-result bt-tl-result--vetoed">Vetoed</span>';
          else if (stage.result === 'signed') resultBadge = '<span class="bt-tl-result bt-tl-result--signed">Signed</span>';

          html += `<div class="bt-tl-stage ${phaseClass} ${typeClass} ${isFirst ? 'bt-tl-stage--first' : ''} ${isLast ? 'bt-tl-stage--last' : ''}" data-stage-id="${stage.id}">
            <div class="bt-tl-node">
              <div class="bt-tl-line-top"></div>
              <div class="bt-tl-marker">${markerIcon}</div>
              <div class="bt-tl-line-bottom"></div>
            </div>
            <div class="bt-tl-content">
              <div class="bt-tl-label">${esc(stage.label)} ${resultBadge}</div>
              ${stage.sublabel ? `<div class="bt-tl-sublabel">${stage.sublabel}</div>` : ''}
              ${stage.detail ? `<div class="bt-tl-detail">${esc(stage.detail)}${stage.votes ? ` (${stage.votes})` : ''}</div>` : ''}`;

          // User action checkboxes (RTS Comment only — vote tracking moved to main detail)
          if (stage.actionable && stage.phase !== 'future' && isTracked && trackingType === 'rts_comment' && stage.type === 'committee') {
            const actions = userActions[stage.id] || {};
            html += `<div class="bt-tl-actions">
              <label class="bt-tl-action">
                <input type="checkbox" class="bt-tl-checkbox" data-bill="${esc(bill.number)}" data-stage="${stage.id}" data-action="commented" ${actions.commented ? 'checked' : ''}>
                <span>I left an RTS Comment</span>
              </label>
            </div>`;
          }

          html += `</div></div>`;
        });
        html += '</div>';
      }

      html += '</div>';
    }

    panel.innerHTML = html;
    bindTimelineEvents(panel, bill);
  }

  function bindTimelineEvents(panel, bill) {
    // Checkbox events — save action and refresh detail tracking section
    panel.querySelectorAll('.bt-tl-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        tracking.setBillAction(cb.dataset.bill, cb.dataset.stage, cb.dataset.action, cb.checked);
        // Re-render the detail panel's tracking section to show updated history
        renderBillDetail(bill);
      });
    });

    // Section collapse/expand
    panel.querySelectorAll('.bt-tl-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const key = header.dataset.bill + '-' + header.dataset.section;
        const isExpanded = timelineSectionState[key];
        timelineSectionState[key] = isExpanded === undefined ? true : !isExpanded;
        // For sections that are auto-expanded (current), first click should collapse
        if (isExpanded === undefined) {
          const stages = buildTimelineStages(bill);
          const isCurrent = stages.currentSection === header.dataset.section;
          timelineSectionState[key] = !isCurrent;
        }
        renderTimeline(bill);
      });
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
      });
    });
  }

  function showTimeline(bill) {
    renderAdvocacyPanel(bill);
    renderTimeline(bill);
    document.getElementById('bt-timeline').classList.add('bt-timeline--open');
    // Show advocacy panel if it has content
    const advocacyEl = document.getElementById('bt-advocacy');
    const panelEl = document.getElementById('bt-advocacy-panel');
    if (advocacyEl) {
      advocacyEl.classList.toggle('bt-advocacy--open', panelEl && panelEl.innerHTML.length > 0);
    }
  }

  function renderAdvocacyPanel(bill) {
    const panel = document.getElementById('bt-advocacy-panel');
    if (!panel) return;

    const recs = bill.org_recommendations || [];
    if (recs.length === 0) {
      panel.innerHTML = '';
      return;
    }

    let visibleRecs;
    if (isLoggedIn()) {
      // Logged in: filter to only orgs the user follows
      const followed = tracking.getFollowedOrgLists();
      const followedOrgs = new Set(Object.keys(followed).filter(orgCode => {
        const cats = followed[orgCode];
        return cats && Object.values(cats).some(v => v);
      }));
      visibleRecs = recs.filter(r => followedOrgs.has(r.org_code));
    } else {
      // Guest: show all org positions
      visibleRecs = recs;
    }
    if (visibleRecs.length === 0) {
      panel.innerHTML = '';
      return;
    }

    let html = `<div class="bt-advocacy-header">Advocacy Positions</div>`;
    for (let i = 0; i < visibleRecs.length; i++) {
      const rec = visibleRecs[i];
      const posClass = rec.position === 'oppose' ? 'bt-hearing-org-rec--oppose' : 'bt-hearing-org-rec--support';
      const posLabel = rec.position === 'oppose' ? 'OPPOSE' : 'SUPPORT';
      html += `<div class="bt-advocacy-card">
        <div class="bt-advocacy-card-header bt-advocacy-toggle" data-idx="${i}" role="button" tabindex="0">
          <span class="bt-list-card-chevron bt-advocacy-chevron">&#9660;</span>
          <span class="bt-advocacy-org">${esc(rec.org_name || rec.org_code)}</span>
          <span class="bt-hearing-org-rec ${posClass}" style="margin-left: auto;">${posLabel}</span>
        </div>
        <div class="bt-advocacy-card-body" data-idx="${i}">
          ${rec.category && rec.category !== 'All Bills' ? `<div class="bt-advocacy-category">${esc(rec.category)}</div>` : ''}
          ${rec.description ? `<div class="bt-advocacy-desc">${esc(rec.description)}</div>` : ''}
          ${rec.source_url ? `<a href="${esc(rec.source_url)}" target="_blank" rel="noopener" class="bt-advocacy-source">View source &rarr;</a>` : ''}
        </div>
      </div>`;
    }
    panel.innerHTML = html;

    // Bind collapse/expand toggles
    panel.querySelectorAll('.bt-advocacy-toggle').forEach(header => {
      header.addEventListener('click', () => {
        const body = panel.querySelector(`.bt-advocacy-card-body[data-idx="${header.dataset.idx}"]`);
        const chevron = header.querySelector('.bt-advocacy-chevron');
        if (body) {
          const isOpen = body.style.display !== 'none';
          body.style.display = isOpen ? 'none' : '';
          chevron.innerHTML = isOpen ? '&#9654;' : '&#9660;';
        }
      });
    });
  }

  function hideTimeline() {
    document.getElementById('bt-timeline').classList.remove('bt-timeline--open');
    const advocacyEl = document.getElementById('bt-advocacy');
    if (advocacyEl) advocacyEl.classList.remove('bt-advocacy--open');
  }

  function renderVote(vote, index) {
    const total = (vote.yeas || 0) + (vote.nays || 0) + (vote.not_voting || 0) + (vote.excused || 0);
    if (total === 0) return '';
    const pctYea = ((vote.yeas / total) * 100).toFixed(1);
    const pctNay = ((vote.nays / total) * 100).toFixed(1);
    const pctNV = (((vote.not_voting || 0) / total) * 100).toFixed(1);
    const pctEx = (((vote.excused || 0) / total) * 100).toFixed(1);
    const resultClass = vote.result?.toLowerCase().includes('passed') ? 'passed' : 'failed';
    const recordsId = `bt-vote-records-${index}`;

    let html = `<div class="bt-vote">
      <div class="bt-vote-header"><span>${vote.chamber === 'H' ? 'House' : 'Senate'} &middot; ${formatDate(vote.vote_date)}</span>${vote.result ? `<span class="bt-vote-result bt-vote-result--${resultClass}">${esc(vote.result)}</span>` : ''}</div>
      <div class="bt-vote-bar">
        ${vote.yeas ? `<div class="bt-vote-bar-seg bt-vote-bar-seg--yea" style="flex: ${pctYea}">${vote.yeas}</div>` : ''}
        ${vote.nays ? `<div class="bt-vote-bar-seg bt-vote-bar-seg--nay" style="flex: ${pctNay}">${vote.nays}</div>` : ''}
        ${vote.not_voting ? `<div class="bt-vote-bar-seg bt-vote-bar-seg--nv" style="flex: ${pctNV}">${vote.not_voting}</div>` : ''}
        ${vote.excused ? `<div class="bt-vote-bar-seg bt-vote-bar-seg--ex" style="flex: ${pctEx}">${vote.excused}</div>` : ''}
      </div>
      <div class="bt-vote-legend">
        <span class="bt-vote-legend-item"><span class="bt-vote-legend-dot bt-vote-legend-dot--yea"></span>Yea ${vote.yeas}</span>
        <span class="bt-vote-legend-item"><span class="bt-vote-legend-dot bt-vote-legend-dot--nay"></span>Nay ${vote.nays}</span>
        ${vote.not_voting ? `<span class="bt-vote-legend-item"><span class="bt-vote-legend-dot bt-vote-legend-dot--nv"></span>NV ${vote.not_voting}</span>` : ''}
        ${vote.excused ? `<span class="bt-vote-legend-item"><span class="bt-vote-legend-dot bt-vote-legend-dot--ex"></span>Excused ${vote.excused}</span>` : ''}
      </div>`;

    if (vote.records?.length) {
      const voteOrder = { Y: 0, N: 1, NV: 2 };
      const sorted = [...vote.records].sort((a, b) => {
        const va = voteOrder[a.vote] ?? 3;
        const vb = voteOrder[b.vote] ?? 3;
        if (va !== vb) return va - vb;
        if ((a.party || '') !== (b.party || '')) return (a.party || '').localeCompare(b.party || '');
        return (a.legislator || '').localeCompare(b.legislator || '');
      });
      html += `<button class="bt-vote-toggle" aria-controls="${recordsId}">Show individual votes</button>
        <div class="bt-vote-records" id="${recordsId}"><div class="bt-vote-grid">${sorted.map(r => `
          <div class="bt-vote-record"><span class="bt-vote-record-vote bt-vote-record-vote--${esc(r.vote)}">${esc(r.vote)}</span><span class="bt-vote-record-name"><span class="bt-party bt-party--${esc(r.party)}"></span>${esc(r.legislator)}</span></div>
        `).join('')}</div></div>`;
    }
    return html + `</div>`;
  }

  function bindDetailEvents(body, bill) {
    // Vote toggles
    body.querySelectorAll('.bt-vote-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = body.querySelector(`#${btn.getAttribute('aria-controls')}`);
        const open = target.classList.toggle('bt-vote-records--open');
        btn.textContent = open ? 'Hide individual votes' : 'Show individual votes';
      });
    });

    // Position buttons — sync to both list item AND hearing actions
    body.querySelectorAll('.bt-position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = btn.dataset.position;
        const lists = tracking.getListsForBill(bill.number);
        const newPosition = lists[0]?.items[bill.number]?.position === current ? null : current;
        for (const list of lists) {
          tracking.updateItem(list.id, bill.number, { position: newPosition });
        }
        // Sync to hearing actions for all agendas on this bill
        for (const a of (bill.rts_agendas || [])) {
          tracking.setHearingAction(a.agenda_item_id, { position: newPosition });
        }
        renderBillDetail(bill);
        showTimeline(bill);
      });
    });

    // RTS comment auto-save with character counter
    const textarea = body.querySelector('#bt-rts-textarea');
    if (textarea) {
      const counter = body.querySelector('#bt-rts-counter');
      let saveTimer = null;
      textarea.addEventListener('input', () => {
        // Update character counter
        if (counter) {
          const len = textarea.value.length;
          counter.textContent = `${len}/250`;
          counter.className = 'bt-rts-counter' + (len > 250 ? ' bt-rts-counter--over' : len > 200 ? ' bt-rts-counter--warn' : '');
        }
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          tracking.updateItem(textarea.dataset.list, textarea.dataset.number, {
            rtsComment: textarea.value,
            needsAttention: false,
          });
          updateListsBadge();
        }, 500);
      });
    }

    // Copy RTS comment to clipboard
    const copyBtn = body.querySelector('#bt-rts-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const rtsTextarea = body.querySelector('#bt-rts-textarea');
        if (rtsTextarea && rtsTextarea.value) {
          navigator.clipboard.writeText(rtsTextarea.value).then(() => {
            const original = copyBtn.innerHTML;
            copyBtn.innerHTML = '&#10003; Copied!';
            setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
          });
        }
      });
    }

    // Notes auto-save (no character limit, not cleared on status change)
    const notesTextarea = body.querySelector('#bt-notes-textarea');
    if (notesTextarea) {
      let notesSaveTimer = null;
      notesTextarea.addEventListener('input', () => {
        clearTimeout(notesSaveTimer);
        notesSaveTimer = setTimeout(() => {
          tracking.updateItem(notesTextarea.dataset.list, notesTextarea.dataset.number, {
            notes: notesTextarea.value,
          });
        }, 500);
      });
    }

    // Tracking label auto-save
    const labelInput = body.querySelector('#bt-tracking-label');
    if (labelInput) {
      let labelTimer = null;
      labelInput.addEventListener('input', () => {
        clearTimeout(labelTimer);
        labelTimer = setTimeout(() => {
          tracking.updateItem(labelInput.dataset.list, labelInput.dataset.number, {
            customLabel: labelInput.value,
          });
        }, 500);
      });
    }

    // Submit Position button — opens AZLeg RTS and copies bill number
    const submitPosBtn = body.querySelector('.bt-submit-position-btn');
    if (submitPosBtn) {
      submitPosBtn.addEventListener('click', () => {
        const num = submitPosBtn.dataset.number;
        navigator.clipboard.writeText(num).then(() => {
          const orig = submitPosBtn.innerHTML;
          submitPosBtn.innerHTML = '&#10003; Copied ' + esc(num) + '!';
          setTimeout(() => { submitPosBtn.innerHTML = orig; }, 2000);
        });
        window.open('https://apps.azleg.gov/RequestToSpeak/MyBillPositions', '_blank');
      });
    }

    // "I submitted my position" checkbox in tracking section
    const submittedCb = body.querySelector('.bt-detail-submitted-cb');
    if (submittedCb) {
      submittedCb.addEventListener('change', () => {
        const agendas = bill.rts_agendas || [];
        for (const a of agendas) {
          tracking.setHearingAction(a.agenda_item_id, { voted: submittedCb.checked });
        }
      });
    }

    // Bind hearing card events (RTS submit link copies comment to clipboard)
    bindHearingActions(body, bill);

    // Add to list button in detail
    const addBtn = body.querySelector('.bt-detail-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showListPopover(addBtn, bill.number);
      });
    }
  }

  /* ============================================================
     RTS Agendas — inline rendering from bill detail API response
     ============================================================ */

  function renderRtsAgendasSection(agendas, billNumber) {
    const upcoming = agendas.filter(a => !a.is_past);
    if (upcoming.length === 0) return '';

    let html = `<div class="bt-detail-section"><h3 class="bt-detail-section-title">Upcoming Hearings</h3>`;
    for (const agenda of upcoming) {
      // Inject bill_number so the card can reference it for clipboard copy
      const agendaWithBill = { ...agenda, bill_number: billNumber };
      // In detail view: no full action row — just the comment checkbox
      html += renderHearingCard(agendaWithBill, false, null, true);
    }
    html += `</div>`;
    return html;
  }

  function renderHearingCard(agenda, showActions, bill, inDetailView) {
    const action = isLoggedIn() ? tracking.getHearingAction(agenda.agenda_item_id) : null;
    const billNumber = bill?.number || agenda.bill_number;
    const isTracked = isLoggedIn() && billNumber && tracking.isTracked(billNumber);

    let html = `<div class="bt-rts-agenda-card bt-hearing-card-full" data-agenda-id="${agenda.agenda_item_id}">`;

    // Bill header row (for hearings tab)
    if (bill) {
      const billDesc = bill.description && bill.description !== (bill.number + ' - ' + bill.short_title)
        ? bill.description : '';
      html += `<div class="bt-hearing-bill-info" data-number="${esc(bill.number)}">
        <div class="bt-hearing-bill-header">
          <span class="bt-hearing-bill-number">${esc(bill.number)}</span>
          <span class="bt-status bt-status--${esc(bill.status || '')}" style="font-size: 11px; padding: 2px 8px;">${statusLabel(bill.status)}</span>
          ${action?.voted ? '<span class="bt-hearing-done-badge" title="You logged your position">&#10003; Voted</span>' : ''}
          ${action?.commented ? '<span class="bt-hearing-done-badge" title="You left a comment">&#10003; Commented</span>' : ''}
          ${agenda.can_rts ? '<span class="bt-rts-open-badge" style="margin-left: auto;">RTS Open</span>' : '<span class="bt-rts-closed-badge" style="margin-left: auto;">RTS Closed</span>'}
        </div>
        <div class="bt-hearing-bill-title">${esc(bill.short_title || bill.description || '')}</div>
        ${billDesc ? `<div class="bt-hearing-bill-desc">${esc(billDesc)}</div>` : ''}
        ${bill.sponsor ? `<div class="bt-hearing-bill-sponsor"><span class="bt-party bt-party--${esc(bill.sponsor_party || '')}"></span>${esc(bill.sponsor)}</div>` : ''}
        ${bill.org_recommendations?.length ? `<div class="bt-hearing-bill-orgs">${renderOrgBadges(bill.org_recommendations)}</div>` : ''}
      </div>`;
    }

    // Main hearing body — two-column layout
    html += `<div class="bt-hearing-body">`;

    // Left column: hearing details + RTS
    html += `<div class="bt-hearing-left">
        <div class="bt-rts-agenda-header">
          <span class="bt-rts-agenda-committee">${agenda.chamber === 'H' ? 'House' : agenda.chamber === 'S' ? 'Senate' : esc(agenda.chamber)} ${esc(agenda.committee)}</span>
          ${!bill ? (agenda.can_rts ? '<span class="bt-rts-open-badge">RTS Open</span>' : '<span class="bt-rts-closed-badge">RTS Closed</span>') : ''}
        </div>
        <div class="bt-rts-agenda-details">
          ${agenda.date ? `<span>${formatDate(agenda.date)}</span>` : ''}
          ${agenda.room ? `<span>${esc(agenda.room)}</span>` : ''}
        </div>
        ${agenda.time ? `<div class="bt-rts-agenda-time">${esc(agenda.time)}</div>` : ''}
        <div class="bt-rts-agenda-positions">
          <span class="bt-rts-tally bt-rts-tally--for">${agenda.positions.for} For</span>
          <span class="bt-rts-tally bt-rts-tally--against">${agenda.positions.against} Against</span>
          <span class="bt-rts-tally bt-rts-tally--neutral">${agenda.positions.neutral} Neutral</span>
        </div>
        <div class="bt-rts-link-row">
          ${agenda.can_rts
            ? `<a href="${esc(agenda.rts_url)}" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts bt-rts-submit-link" data-bill="${esc(billNumber)}">&#128483; Submit Request to Speak</a>`
            : `<a href="https://apps.azleg.gov/RequestToSpeak/MyBillPositions" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts">&#128483; Set My Bill Position</a>`
          }
        </div>
      </div>`;

    // Right column: bill overview (only in hearings tab where bill context exists)
    if (bill) {
      const overview = bill.overview || bill.description || bill.short_title || '';
      html += `<div class="bt-hearing-right">
        <div class="bt-hearing-summary-label">Bill Overview</div>
        <div class="bt-hearing-summary-text">${esc(overview)}</div>
        ${bill.azleg_url ? `<a href="${esc(bill.azleg_url)}" target="_blank" rel="noopener" class="bt-hearing-azleg-link">View full bill on AZLeg.gov &rarr;</a>` : ''}
      </div>`;
    }

    html += `</div>`; // close bt-hearing-body

    // Detail view: just a "Left my comment" checkbox below the Submit RTS button
    if (isLoggedIn() && inDetailView && isTracked) {
      html += `<div class="bt-hearing-actions bt-hearing-actions--minimal" data-agenda-id="${agenda.agenda_item_id}">
        <label class="bt-hearing-action-check">
          <input type="checkbox" class="bt-hearing-commented-cb" data-agenda-id="${agenda.agenda_item_id}" ${action?.commented ? 'checked' : ''}>
          <span>I left my RTS comment for this hearing</span>
        </label>
      </div>`;
    }

    // Full action row — checkboxes, org recommendations, and list button (hearings tab only)
    if (isLoggedIn() && !inDetailView) {
      // Sync position: use hearing action position, fallback to bill tracking position
      let activePosition = action?.position || null;
      if (!activePosition && isTracked) {
        const lists = tracking.getListsForBill(billNumber);
        activePosition = lists[0]?.items[billNumber]?.position || null;
      }

      html += `<div class="bt-hearing-actions" data-agenda-id="${agenda.agenda_item_id}">
        <div class="bt-hearing-actions-left">
          <div class="bt-hearing-actions-row">
            <label class="bt-hearing-action-check">
              <input type="checkbox" class="bt-hearing-voted-cb" data-agenda-id="${agenda.agenda_item_id}" data-bill="${esc(billNumber)}" ${action?.voted ? 'checked' : ''}>
              <span>I submitted my position</span>
            </label>
            <label class="bt-hearing-action-check">
              <input type="checkbox" class="bt-hearing-commented-cb" data-agenda-id="${agenda.agenda_item_id}" ${action?.commented ? 'checked' : ''}>
              <span>I left my RTS comment</span>
            </label>
          </div>
          <div class="bt-hearing-position-row" ${action?.voted ? '' : 'hidden'}>
            <span class="bt-hearing-position-label">My vote:</span>
            ${['for', 'neutral', 'against'].map(pos =>
              `<button class="bt-position-btn bt-position-btn--${pos} ${activePosition === pos ? 'bt-position-btn--active' : ''}" data-agenda-id="${agenda.agenda_item_id}" data-bill="${esc(billNumber)}" data-hearing-position="${pos}">${POSITION_LABELS[pos]}</button>`
            ).join('')}
          </div>
        </div>
        <div class="bt-hearing-actions-center">
          ${bill?.org_recommendations ? renderOrgBadges(bill.org_recommendations) : ''}
        </div>
        ${!inDetailView ? `<div class="bt-hearing-actions-right">
          <button class="bt-btn bt-btn--small bt-hearing-list-btn ${isTracked ? 'bt-hearing-list-btn--tracked' : ''}" data-number="${esc(billNumber)}" title="${isTracked ? 'On a list' : 'Add to list'}">
            ${isTracked ? '&#10003; On List' : '+ Add to List'}
          </button>
        </div>` : ''}
      </div>`;
    }

    html += `</div>`;
    return html;
  }

  /** Bind hearing action checkboxes and position buttons */
  function bindHearingActions(container, bill) {
    container.querySelectorAll('.bt-hearing-voted-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.agendaId;
        tracking.setHearingAction(id, { voted: cb.checked });
        const posRow = cb.closest('.bt-hearing-actions').querySelector('.bt-hearing-position-row');
        if (posRow) posRow.hidden = !cb.checked;
        if (!cb.checked) {
          tracking.setHearingAction(id, { position: null });
          posRow?.querySelectorAll('.bt-position-btn').forEach(b => b.classList.remove('bt-position-btn--active'));
        }
        // Sync all voted checkboxes with same agenda ID
        document.querySelectorAll(`.bt-hearing-voted-cb[data-agenda-id="${id}"]`).forEach(other => {
          if (other !== cb) other.checked = cb.checked;
        });
      });
    });
    container.querySelectorAll('.bt-hearing-commented-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        tracking.setHearingAction(cb.dataset.agendaId, { commented: cb.checked });
        // Sync all checkboxes with same agenda ID across the page
        document.querySelectorAll(`.bt-hearing-commented-cb[data-agenda-id="${cb.dataset.agendaId}"]`).forEach(other => {
          if (other !== cb) other.checked = cb.checked;
        });
      });
    });
    container.querySelectorAll('[data-hearing-position]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.agendaId;
        const pos = btn.dataset.hearingPosition;
        const billNum = btn.dataset.bill;
        const current = tracking.getHearingAction(id);
        const newPos = current?.position === pos ? null : pos;
        tracking.setHearingAction(id, { position: newPos });
        // Also sync to bill tracking position if bill is on a list
        if (billNum && tracking.isTracked(billNum)) {
          const lists = tracking.getListsForBill(billNum);
          for (const list of lists) {
            tracking.updateItem(list.id, billNum, { position: newPos });
          }
        }
        btn.closest('.bt-hearing-position-row').querySelectorAll('.bt-position-btn').forEach(b => {
          b.classList.toggle('bt-position-btn--active', b.dataset.hearingPosition === newPos);
        });
      });
    });
    // Copy RTS comment to clipboard when clicking Submit Request to Speak
    container.querySelectorAll('.bt-rts-submit-link').forEach(link => {
      link.addEventListener('click', () => {
        const num = link.dataset.bill;
        if (!num || !isLoggedIn()) return;
        const lists = tracking.getListsForBill(num);
        const comment = lists[0]?.items[num]?.rtsComment;
        if (comment) {
          navigator.clipboard.writeText(comment).catch(() => {});
        }
      });
    });

    // Add-to-list buttons on hearing cards
    container.querySelectorAll('.bt-hearing-list-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const num = btn.dataset.number;
        // Ensure bill is in cache (hearings tab may not have loaded it)
        if (!state.billCache[num] && hearingsState.data) {
          const hearing = hearingsState.data.hearings.find(h => h.bill_number === num);
          if (hearing?.bill) state.billCache[num] = hearing.bill;
        }
        showListPopover(btn, num);
      });
    });
  }

  /* ============================================================
     RTS Agenda Fetcher — async fallback for demo mode
     ============================================================ */

  const rtsCache = {}; // billNumber → { data, timestamp }
  const RTS_CACHE_TTL = 60 * 60 * 1000; // 1 hour client-side

  async function loadRtsAgendas(billNumber) {
    const container = document.getElementById('bt-rts-agendas');
    if (!container || container.dataset.bill !== billNumber) return;

    // Check client cache
    const cached = rtsCache[billNumber];
    if (cached && Date.now() - cached.timestamp < RTS_CACHE_TTL) {
      renderRtsAgendas(container, cached.data);
      return;
    }

    // Only fetch in production mode
    if (state.mode === 'demo') {
      container.innerHTML = '<div class="bt-rts-link-row"><a href="https://apps.azleg.gov/RequestToSpeak/MyBillPositions" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts">&#128483; Set My Bill Position</a></div>';
      return;
    }

    container.innerHTML = '<div class="bt-rts-loading">Checking RTS availability...</div>';

    try {
      const resp = await fetch(`${state.apiBase}/api/rts/${encodeURIComponent(billNumber)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      rtsCache[billNumber] = { data, timestamp: Date.now() };
      // Re-check container is still for this bill (user may have navigated away)
      if (container.dataset.bill === billNumber) {
        renderRtsAgendas(container, data);
      }
    } catch (err) {
      console.error('RTS fetch failed:', err);
      container.innerHTML = '<div class="bt-rts-link-row"><a href="https://apps.azleg.gov/RequestToSpeak/MyBillPositions" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts">&#128483; Set My Bill Position</a></div>';
    }
  }

  function renderRtsAgendas(container, data) {
    if (!data.session_active) {
      container.innerHTML = '<div class="bt-rts-inactive">Legislative session not active — RTS unavailable</div>';
      return;
    }

    const agendas = (data.agendas || []).filter(a => !a.is_past);

    if (agendas.length === 0) {
      container.innerHTML = '<div class="bt-rts-link-row"><a href="https://apps.azleg.gov/RequestToSpeak/MyBillPositions" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts">&#128483; Request to Speak</a></div><div class="bt-rts-hint">No upcoming committee hearings found for this bill.</div>';
      return;
    }

    let html = '';
    for (const agenda of agendas) {
      html += `<div class="bt-rts-agenda-card">
        <div class="bt-rts-agenda-header">
          <span class="bt-rts-agenda-committee">${agenda.chamber} ${esc(agenda.committee)}</span>
          ${agenda.can_rts ? '<span class="bt-rts-open-badge">RTS Open</span>' : '<span class="bt-rts-closed-badge">RTS Closed</span>'}
        </div>
        <div class="bt-rts-agenda-details">
          ${agenda.date ? `<span>${esc(agenda.date)}</span>` : ''}
          ${agenda.time ? `<span>${esc(agenda.time)}</span>` : ''}
          ${agenda.room ? `<span>${esc(agenda.room)}</span>` : ''}
        </div>
        <div class="bt-rts-agenda-positions">
          <span class="bt-rts-tally bt-rts-tally--for">${agenda.positions.for} For</span>
          <span class="bt-rts-tally bt-rts-tally--against">${agenda.positions.against} Against</span>
          <span class="bt-rts-tally bt-rts-tally--neutral">${agenda.positions.neutral} Neutral</span>
        </div>
        <div class="bt-rts-link-row">
          ${agenda.can_rts
            ? `<a href="${esc(agenda.rts_url)}" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts">&#128483; Submit RTS for this hearing</a>`
            : `<a href="https://apps.azleg.gov/RequestToSpeak/MyBillPositions" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-rts-azleg-link bt-rts-azleg-link--rts">&#128483; Set My Bill Position</a>`
          }
        </div>
      </div>`;
    }

    container.innerHTML = html;
  }

  /* ============================================================
     Rendering — My Lists View
     ============================================================ */

  // Track which lists are expanded and whether archived bills are shown
  const listsUIState = { expanded: {}, showArchived: false, orgListsExpanded: false };

  function renderMyLists() {
    const container = document.getElementById('bt-lists-container');
    const attentionEl = document.getElementById('bt-lists-attention');
    const lists = tracking.getListArray();

    // Attention summary
    const attentionCount = tracking.getAttentionCount();
    attentionEl.innerHTML = attentionCount > 0
      ? `<div class="bt-attention-banner"><span class="bt-attention-banner-icon">&#9888;&#65039;</span>${attentionCount} bill${attentionCount !== 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} attention — status changed, re-submit RTS on azleg.gov</div>`
      : '';

    // Update settings menu delete list options
    const deleteListsEl = document.getElementById('bt-settings-delete-lists');
    if (deleteListsEl) {
      deleteListsEl.innerHTML = lists.length === 0
        ? '<div class="bt-settings-item bt-settings-item--disabled">No lists</div>'
        : lists.map(l => `<button class="bt-settings-item bt-settings-item--danger bt-settings-delete-list" data-list-id="${l.id}">&#128465; ${esc(l.name)}</button>`).join('');
    }

    // Update archived toggle text
    const toggleBtn = document.getElementById('bt-toggle-archived');
    if (toggleBtn) {
      toggleBtn.textContent = listsUIState.showArchived ? 'Hide Archived Bills' : 'Show Archived Bills';
    }

    if (lists.length === 0) {
      container.innerHTML = `<div class="bt-empty"><div class="bt-empty-icon">&#128203;</div><div class="bt-empty-text">No lists yet</div><div class="bt-empty-sub">Create a list and start tracking bills while browsing</div></div>`;
      return;
    }

    container.innerHTML = lists.map(list => renderListCard(list)).join('');
    bindListEvents(container);

    // Org lists section collapse/expand
    const orgHeading = document.getElementById('bt-org-lists-heading');
    const orgContainer = document.getElementById('bt-org-lists-container');
    const orgChevron = document.getElementById('bt-org-lists-chevron');
    if (orgHeading && orgContainer) {
      orgContainer.hidden = !listsUIState.orgListsExpanded;
      orgChevron.innerHTML = listsUIState.orgListsExpanded ? '&#9660;' : '&#9654;';
      orgHeading.onclick = () => {
        listsUIState.orgListsExpanded = !listsUIState.orgListsExpanded;
        orgContainer.hidden = !listsUIState.orgListsExpanded;
        orgChevron.innerHTML = listsUIState.orgListsExpanded ? '&#9660;' : '&#9654;';
        if (listsUIState.orgListsExpanded) loadOrgLists();
      };
      if (listsUIState.orgListsExpanded) loadOrgLists();
    }
  }

  let orgListsCache = null;

  async function loadOrgLists() {
    const container = document.getElementById('bt-org-lists-container');
    if (!container) return;

    if (state.mode === 'demo') {
      container.innerHTML = '<div class="bt-empty-sub">Organization lists unavailable in demo mode</div>';
      return;
    }

    if (!orgListsCache) {
      try {
        orgListsCache = await fetchJSON(`${state.apiBase}/api/orgs`);
      } catch (err) {
        console.error('Failed to load org lists:', err);
        container.innerHTML = '';
        return;
      }
    }

    renderOrgLists(container, orgListsCache);
  }

  const orgUIState = { expanded: {} };

  function renderOrgLists(container, data) {
    const orgs = data.orgs || [];
    if (orgs.length === 0) {
      container.innerHTML = '<div class="bt-empty-sub">No organization lists available yet.</div>';
      return;
    }

    let html = '';
    for (const org of orgs) {
      html += `<div class="bt-org-card">
        <div class="bt-org-card-header">
          <span class="bt-org-card-name">${esc(org.name)} (${esc(org.code)})</span>
          ${org.website ? `<a href="${esc(org.website)}" target="_blank" rel="noopener" class="bt-org-card-link">${esc(org.website)} &rarr;</a>` : ''}
        </div>`;

      for (const [category, bills] of Object.entries(org.categories)) {
        const isFollowed = isLoggedIn() && tracking.isOrgListFollowed(org.code, category);
        const catKey = org.code + '-' + category;
        const isExpanded = !!orgUIState.expanded[catKey];
        html += `<div class="bt-org-list ${isFollowed ? 'bt-org-list--followed' : ''}">
          <div class="bt-org-list-header bt-org-list-toggle" data-cat-key="${esc(catKey)}" role="button" tabindex="0">
            <span class="bt-list-card-chevron">${isExpanded ? '&#9660;' : '&#9654;'}</span>
            <span class="bt-org-list-name">${esc(category)}</span>
            <span class="bt-org-list-count">${bills.length} bill${bills.length !== 1 ? 's' : ''}</span>
            ${isLoggedIn() ? `<button class="bt-btn bt-btn--small bt-org-follow-btn ${isFollowed ? 'bt-org-follow-btn--active' : ''}" data-org="${esc(org.code)}" data-category="${esc(category)}">
              ${isFollowed ? '&#10003; Following' : 'Follow This List'}
            </button>` : ''}
          </div>
          ${isExpanded ? `<div class="bt-org-list-bills">
            ${bills.map(b => {
              const posClass = b.position === 'oppose' ? 'bt-hearing-org-rec--oppose' : 'bt-hearing-org-rec--support';
              const posLabel = b.position === 'oppose' ? 'OPPOSE' : 'SUPPORT';
              return `<div class="bt-org-list-bill" data-number="${esc(b.bill_number)}" style="cursor: pointer;">
                <span class="bt-org-list-bill-number">${esc(b.bill_number)}</span>
                <span class="bt-hearing-org-rec ${posClass}" style="font-size: 10px;">${posLabel}</span>
                <span class="bt-org-list-bill-desc">${esc(b.description || '')}</span>
              </div>`;
            }).join('')}
          </div>` : ''}
        </div>`;
      }
      html += `</div>`;
    }

    container.innerHTML = html;

    // Bind category toggles
    container.querySelectorAll('.bt-org-list-toggle').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.bt-org-follow-btn')) return; // Don't toggle when clicking follow
        const key = header.dataset.catKey;
        orgUIState.expanded[key] = !orgUIState.expanded[key];
        renderOrgLists(container, data);
      });
    });

    // Bind follow buttons
    container.querySelectorAll('.bt-org-follow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orgCode = btn.dataset.org;
        const category = btn.dataset.category;
        const isFollowed = tracking.isOrgListFollowed(orgCode, category);
        tracking.followOrgList(orgCode, category, !isFollowed);

        if (!isFollowed) {
          // Create a named list for this org category and add all bills
          const org = orgListsCache?.orgs?.find(o => o.code === orgCode);
          const bills = org?.categories?.[category] || [];
          const listName = `${orgCode}: ${category}`;

          // Find existing list with this name, or create new one
          let targetList = tracking.getListArray().find(l => l.name === listName);
          let listId;
          if (targetList) {
            listId = targetList.id;
          } else {
            listId = tracking.createList(listName);
          }

          // Track which bills are in this org list (for new-bill detection)
          const data = tracking.load();
          if (!data.orgListBills) data.orgListBills = {};
          data.orgListBills[`${orgCode}-${category}`] = bills.map(b => b.bill_number);
          if (!data.orgListSeen) data.orgListSeen = {};
          data.orgListSeen[`${orgCode}-${category}`] = bills.map(b => b.bill_number);
          tracking.save();

          for (const b of bills) {
            const cached = state.billCache[b.bill_number];
            const billObj = cached || { number: b.bill_number, status: 'unknown', last_action: '' };
            const existing = tracking.load().lists[listId]?.items[b.bill_number];
            if (!existing) {
              tracking.addToList(listId, billObj);
              const pos = b.position === 'oppose' ? 'against' : b.position === 'support' ? 'for' : null;
              const updates = { orgPosition: b.position, savedTitle: b.description || '' };
              if (pos) updates.position = pos;
              if (b.source_url) updates.notes = b.source_url;
              tracking.updateItem(listId, b.bill_number, updates);
            }
          }
          updateListsBadge();
        }

        renderMyLists();
      });
    });

    // Bind bill clicks to open detail
    container.querySelectorAll('.bt-org-list-bill').forEach(el => {
      el.addEventListener('click', () => openBillDetail(el.dataset.number));
    });
  }

  function renderListCard(list) {
    const allItems = Object.values(list.items);
    const activeItems = allItems.filter(i => !i.archived);
    const archivedItems = allItems.filter(i => i.archived);
    const visibleItems = listsUIState.showArchived ? allItems : activeItems;
    const isExpanded = !!listsUIState.expanded[list.id];

    // Count items needing action
    const actionNeeded = activeItems.filter(i => {
      if (!i.position) return true;
      const bill = state.billCache[i.number];
      const agendas = bill?.rts_agendas || [];
      if (agendas.some(a => !a.is_past && !tracking.getHearingAction(a.agenda_item_id)?.commented)) return true;
      if (i.rtsNeeded) return true;
      return false;
    }).length;

    let html = `<div class="bt-list-card ${isExpanded ? 'bt-list-card--expanded' : ''}" data-list-id="${list.id}">
      <div class="bt-list-card-header bt-list-card-toggle" data-list-id="${list.id}" role="button" aria-expanded="${isExpanded}" tabindex="0">
        <div class="bt-list-card-header-left">
          <span class="bt-list-card-chevron" aria-hidden="true">${isExpanded ? '&#9660;' : '&#9654;'}</span>
          <span class="bt-list-card-name">${esc(list.name)}</span>
          <span class="bt-list-card-count">${activeItems.length} bill${activeItems.length !== 1 ? 's' : ''}${actionNeeded ? ` &middot; ${actionNeeded} need action` : ''}${archivedItems.length ? ` &middot; ${archivedItems.length} archived` : ''}</span>
        </div>
        ${actionNeeded > 0 ? '<span class="bt-list-card-attention">&#9888;&#65039;</span>' : ''}
      </div>`;

    if (isExpanded) {
      if (visibleItems.length === 0) {
        html += `<div class="bt-list-empty">${listsUIState.showArchived ? 'No bills in this list.' : 'No active bills. Browse bills and click + to add them.'}</div>`;
      } else {
        // Sort: items needing action first, then by bill number; archived last
        const sorted = [...visibleItems].sort((a, b) => {
          if (a.archived !== b.archived) return a.archived ? 1 : -1;
          const aTodo = !a.position || a.rtsNeeded;
          const bTodo = !b.position || b.rtsNeeded;
          if (aTodo !== bTodo) return aTodo ? -1 : 1;
          return (a.number || '').localeCompare(b.number || '');
        });

        html += sorted.map(item => renderTrackedBill(list.id, item)).join('');
      }
    }

    html += `</div>`;
    return html;
  }

  function renderTrackedBill(listId, item) {
    const bill = state.billCache[item.number];
    const title = item.customLabel || bill?.short_title || bill?.description || item.savedTitle || '';
    const isArchived = !!item.archived;
    const posClass = item.orgPosition === 'oppose' ? 'bt-hearing-org-rec--oppose' :
                     item.orgPosition === 'support' ? 'bt-hearing-org-rec--support' : '';
    const posLabel = item.orgPosition === 'oppose' ? 'OPPOSE' :
                     item.orgPosition === 'support' ? 'SUPPORT' : '';

    // Determine action-needed indicators
    const todos = [];
    if (!isArchived) {
      if (!item.position) todos.push('Set Position');

      // Check if position submitted to AZLeg
      const agendas = bill?.rts_agendas || [];
      const hasSubmitted = agendas.some(a => tracking.getHearingAction(a.agenda_item_id)?.voted);
      if (item.position && !hasSubmitted) todos.push('Submit to AZLeg');

      // Check if on agenda but no RTS comment left
      const hasUpcoming = agendas.some(a => !a.is_past);
      if (hasUpcoming) {
        const hasCommented = agendas.some(a => tracking.getHearingAction(a.agenda_item_id)?.commented);
        if (!hasCommented) todos.push('RTS Comment Needed');
      }

      if (item.rtsNeeded) todos.push('Bill Moved');
    }

    let html = `<div class="bt-tracked-row ${isArchived ? 'bt-tracked-bill--archived' : ''}" data-bill-number="${esc(item.number)}" data-number="${esc(item.number)}">
      <div class="bt-tracked-row-info" data-number="${esc(item.number)}">
        <span class="bt-org-list-bill-number">${esc(item.number)}</span>
        ${posLabel ? `<span class="bt-hearing-org-rec ${posClass}" style="font-size: 10px;">${posLabel}</span>` : ''}
        ${isArchived ? '<span class="bt-track-type bt-track-type--archived" style="font-size: 10px;">Archived</span>' : ''}
        <span class="bt-org-list-bill-desc">${esc(title)}</span>
        ${todos.length > 0 ? todos.map(t => `<span class="bt-todo-badge">${t}</span>`).join('') : ''}
      </div>
      <div class="bt-tracked-row-actions">
        <button class="bt-tracked-edit-btn" data-list="${listId}" data-number="${esc(item.number)}" title="Edit" aria-label="Edit bill">&#9998;</button>
        <div class="bt-tracked-edit-menu" data-list="${listId}" data-number="${esc(item.number)}">
          ${isArchived
            ? `<button class="bt-btn bt-btn--small bt-unarchive-bill" data-list="${listId}" data-number="${esc(item.number)}">Restore</button>`
            : `<button class="bt-btn bt-btn--small bt-archive-bill" data-list="${listId}" data-number="${esc(item.number)}">Archive</button>`
          }
          <button class="bt-btn bt-btn--small bt-btn--danger bt-remove-from-list" data-list="${listId}" data-number="${esc(item.number)}">Remove</button>
        </div>
      </div>
    </div>`;
    return html;
  }

  function bindListEvents(container) {
    // Toggle collapse/expand
    container.querySelectorAll('.bt-list-card-toggle').forEach(header => {
      header.addEventListener('click', () => {
        const listId = header.dataset.listId;
        listsUIState.expanded[listId] = !listsUIState.expanded[listId];
        renderMyLists();
      });
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });

    // Pencil edit button toggle
    container.querySelectorAll('.bt-tracked-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.closest('.bt-tracked-row-actions')?.querySelector('.bt-tracked-edit-menu');
        if (menu) {
          const isOpen = menu.classList.contains('bt-edit-menu--open');
          // Close all menus first
          container.querySelectorAll('.bt-tracked-edit-menu').forEach(m => m.classList.remove('bt-edit-menu--open'));
          if (!isOpen) menu.classList.add('bt-edit-menu--open');
        }
      });
    });

    // Remove bill from list (with enhanced confirmation)
    container.querySelectorAll('.bt-remove-from-list').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const num = btn.dataset.number;
        const listsForBill = tracking.getListsForBill(num);
        const isOnlyList = listsForBill.length <= 1;
        const msg = isOnlyList
          ? `Remove ${num} from this list?\n\nThis is the only list ${num} is on. Removing it will delete your position, notes, and RTS comments on Cactus Watch.\n\nThis does NOT affect your submissions on azleg.gov.`
          : `Remove ${num} from this list?\n\nIf you just want to hide it, use Archive instead.`;
        if (confirm(msg)) {
          tracking.removeFromList(btn.dataset.list, num);
          renderMyLists();
          updateListsBadge();
        }
      });
    });

    // Archive bill
    container.querySelectorAll('.bt-archive-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        tracking.archiveItem(btn.dataset.list, btn.dataset.number);
        renderMyLists();
        updateListsBadge();
      });
    });

    // Unarchive bill
    container.querySelectorAll('.bt-unarchive-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        tracking.unarchiveItem(btn.dataset.list, btn.dataset.number);
        renderMyLists();
        updateListsBadge();
      });
    });

    // Dismiss RTS needed
    container.querySelectorAll('.bt-dismiss-rts').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        tracking.updateItem(btn.dataset.list, btn.dataset.number, { rtsNeeded: false, needsAttention: false });
        renderMyLists();
        updateListsBadge();
      });
    });

    // Close edit menus on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.bt-tracked-edit-btn') && !e.target.closest('.bt-tracked-edit-menu')) {
        container.querySelectorAll('.bt-tracked-edit-menu').forEach(m => m.classList.remove('bt-edit-menu--open'));
      }
    });

    // Click on bill info to open detail
    container.querySelectorAll('.bt-tracked-row-info').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const number = el.dataset.number;
        if (number) openBillDetail(number);
      });
    });
  }

  /* ============================================================
     Rendering — Upcoming Hearings View
     ============================================================ */

  const hearingsState = { data: null, chamber: '', committee: '', org: '', search: '', collapsedDates: {}, pageSize: 20 };

  async function loadHearings() {
    const container = document.getElementById('bt-hearings-container');
    container.innerHTML = '<div class="bt-loading"><div class="bt-spinner"></div><p>Loading hearings...</p></div>';

    try {
      const params = new URLSearchParams();
      if (hearingsState.chamber) params.set('chamber', hearingsState.chamber);
      if (hearingsState.committee) params.set('committee', hearingsState.committee);

      const data = state.mode === 'demo'
        ? { hearings: [], total: 0, committees: [] }
        : await fetchJSON(`${state.apiBase}/api/hearings?${params}`);

      hearingsState.data = data;

      // Populate committee filter
      const committeeSel = document.getElementById('bt-hearings-committee');
      const currentVal = committeeSel.value;
      committeeSel.innerHTML = '<option value="">All Committees</option>' +
        (data.committees || []).map(c => `<option value="${esc(c)}" ${c === currentVal ? 'selected' : ''}>${esc(c)}</option>`).join('');

      // Populate org filter — include all known orgs
      const orgSel = document.getElementById('bt-hearings-org');
      if (orgSel) {
        const orgs = new Set();
        for (const h of data.hearings) {
          for (const r of (h.bill?.org_recommendations || [])) orgs.add(r.org_code);
        }
        // Also add orgs from the org lists cache if loaded
        if (orgListsCache?.orgs) {
          for (const o of orgListsCache.orgs) orgs.add(o.code);
        }
        const currentOrg = orgSel.value;
        orgSel.innerHTML = '<option value="">All Bills</option><option value="__my_lists__">My Lists</option>' +
          [...orgs].sort().map(o => `<option value="${esc(o)}" ${o === currentOrg ? 'selected' : ''}>${esc(o)}</option>`).join('');
      }

      renderHearings(data);
    } catch (err) {
      console.error('Failed to load hearings:', err);
      container.innerHTML = '<div class="bt-empty"><div class="bt-empty-icon">&#9888;&#65039;</div><div class="bt-empty-text">Failed to load hearings</div></div>';
    }
  }

  function renderHearings(data) {
    const container = document.getElementById('bt-hearings-container');
    let hearings = data.hearings || [];

    // Bill number search — bypasses other filters
    if (hearingsState.search) {
      const q = hearingsState.search.toUpperCase();
      hearings = (data.hearings || []).filter(h => h.bill_number.includes(q));
      // Skip other filters when searching
    } else {

    // Filter out hearings whose start time has passed (AZ time = America/Phoenix, no DST)
    hearings = hearings.filter(h => !isHearingPast(h.date, h.time));

    // Organization filter
    if (hearingsState.org === '__my_lists__' && isLoggedIn()) {
      // Show only bills on user's lists (personal + followed org lists)
      const followedOrgs = tracking.load().followedOrgLists || {};
      hearings = hearings.filter(h => {
        if (tracking.isTracked(h.bill_number)) return true;
        // Check if bill is on a followed org list
        for (const [orgCode, cats] of Object.entries(followedOrgs)) {
          if (!cats) continue;
          const recs = h.bill?.org_recommendations || [];
          if (recs.some(r => r.org_code === orgCode && cats[r.category])) return true;
        }
        return false;
      });
    } else if (hearingsState.org) {
      hearings = hearings.filter(h =>
        (h.bill?.org_recommendations || []).some(r => r.org_code === hearingsState.org)
      );
    }

    } // close else block from search bypass

    if (hearings.length === 0) {
      container.innerHTML = '<div class="bt-empty"><div class="bt-empty-icon">&#128483;</div><div class="bt-empty-text">No upcoming hearings found</div><div class="bt-empty-sub">Try adjusting your filters</div></div>';
      return;
    }

    // Pagination
    const totalHearings = hearings.length;
    if (hearingsState.pageSize > 0 && hearingsState.pageSize < totalHearings) {
      hearings = hearings.slice(0, hearingsState.pageSize);
    }

    // Render pagination controls
    const pagEl = document.getElementById('bt-hearings-pagination');
    if (pagEl) {
      const sizes = [20, 50, 100, 0];
      const sizeLabels = { 20: '20', 50: '50', 100: '100', 0: 'All' };
      pagEl.innerHTML = `<span class="bt-page-size-label">Showing ${hearings.length} of ${totalHearings} &middot; Show:</span>` +
        sizes.map(s => `<button class="bt-page-size-btn ${hearingsState.pageSize === s ? 'bt-page-size-btn--active' : ''}" data-size="${s}">${sizeLabels[s]}</button>`).join('');
      pagEl.querySelectorAll('.bt-page-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          hearingsState.pageSize = parseInt(btn.dataset.size, 10);
          renderHearings(hearingsState.data);
        });
      });
    }

    // Group by date
    const byDate = {};
    for (const h of hearings) {
      const dateKey = h.date || 'Unknown';
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(h);
    }

    let html = '';
    for (const [date, items] of Object.entries(byDate)) {
      const isCollapsed = !!hearingsState.collapsedDates[date];
      html += `<div class="bt-hearings-date-group">
        <h3 class="bt-hearings-date-heading">${formatDate(date)}</h3>
        <div class="bt-hearings-date-count">${items.length} hearing${items.length !== 1 ? 's' : ''}</div>
        <button class="bt-btn bt-btn--small bt-hearings-date-toggle" data-date="${esc(date)}">${isCollapsed ? 'Show' : 'Hide'}</button>
      </div>`;
      if (!isCollapsed) {
        for (const h of items) {
          html += renderHearingCard(h, isLoggedIn(), h.bill);
        }
      }
    }

    container.innerHTML = html;
    bindHearingActions(container);

    // Date collapse toggles
    container.querySelectorAll('.bt-hearings-date-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date;
        hearingsState.collapsedDates[date] = !hearingsState.collapsedDates[date];
        renderHearings(hearingsState.data);
      });
    });

    // Bind bill info clicks to open bill detail
    container.querySelectorAll('.bt-hearing-bill-info').forEach(el => {
      el.addEventListener('click', () => openBillDetail(el.dataset.number));
    });
  }

  /* ============================================================
     Add-to-List Popover
     ============================================================ */

  let activePopoverBill = null;

  function showListPopover(anchor, billNumber) {
    activePopoverBill = billNumber;
    const popover = document.getElementById('bt-list-popover');
    const itemsEl = document.getElementById('bt-list-popover-items');
    const createEl = document.getElementById('bt-list-popover-create');
    createEl.hidden = true;

    const lists = tracking.getListArray();
    const bill = state.billCache[billNumber];

    if (lists.length === 0) {
      itemsEl.innerHTML = '<div style="padding: 8px; font-size: 14px; color: var(--bt-text-light);">No lists yet</div>';
    } else {
      itemsEl.innerHTML = lists.map(list => {
        const isOn = !!list.items[billNumber];
        return `<label class="bt-list-popover-item">
          <input type="checkbox" data-list-id="${list.id}" ${isOn ? 'checked' : ''}>
          <span>${esc(list.name)}</span>
        </label>`;
      }).join('');

      // Bind checkboxes
      itemsEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) {
            tracking.addToList(cb.dataset.listId, bill);
          } else {
            tracking.removeFromList(cb.dataset.listId, billNumber);
          }
          updateListsBadge();
          // Update card buttons if visible
          document.querySelectorAll(`.bt-card-add[data-number="${billNumber}"]`).forEach(btn => {
            const tracked = tracking.isTracked(billNumber);
            btn.className = `bt-card-add ${tracked ? 'bt-card-add--tracked' : ''}`;
            btn.innerHTML = tracked ? '&#10003;' : '+';
          });
          // Re-render bill detail if overlay is open (to show/hide tracking section)
          const detailBody = document.getElementById('bt-detail-body');
          if (detailBody && !document.getElementById('bt-overlay').hidden && bill) {
            renderBillDetail(bill);
            if (tracking.isTracked(billNumber)) showTimeline(bill);
          }
          // Update hearing list buttons
          document.querySelectorAll(`.bt-hearing-list-btn[data-number="${billNumber}"]`).forEach(btn => {
            const tracked = tracking.isTracked(billNumber);
            btn.className = `bt-btn bt-btn--small bt-hearing-list-btn ${tracked ? 'bt-hearing-list-btn--tracked' : ''}`;
            btn.innerHTML = tracked ? '&#10003; On List' : '+ Add to List';
          });
        });
      });
    }

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    popover.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 300)}px`;
    popover.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    popover.style.left = 'auto';
    popover.hidden = false;
  }

  function hideListPopover() {
    document.getElementById('bt-list-popover').hidden = true;
    activePopoverBill = null;
  }

  /* ============================================================
     Rendering — Misc
     ============================================================ */

  function renderError(message) {
    document.getElementById('bt-bill-list').innerHTML = `<div class="bt-empty"><div class="bt-empty-icon">&#9888;&#65039;</div><div class="bt-empty-text">${esc(message)}</div></div>`;
  }

  function showLoading(show) {
    document.getElementById('bt-loading').hidden = !show;
    const main = document.getElementById('bt-browse-view');
    if (main) main.style.display = show ? 'none' : '';
  }

  /* ============================================================
     Navigation & Events
     ============================================================ */

  let searchTimer = null;

  function switchTab(tab) {
    state.activeTab = tab;
    const browseView = document.getElementById('bt-browse-view');
    const listsView = document.getElementById('bt-lists-view');
    const hearingsView = document.getElementById('bt-hearings-view');
    const browseControls = document.getElementById('bt-browse-controls');
    const resultsBar = document.getElementById('bt-results-bar');

    document.querySelectorAll('.bt-nav-tab').forEach(t => {
      const isActive = t.dataset.tab === tab;
      t.classList.toggle('bt-nav-tab--active', isActive);
      t.setAttribute('aria-selected', isActive);
    });

    browseView.hidden = tab !== 'browse';
    listsView.hidden = tab !== 'lists';
    hearingsView.hidden = tab !== 'hearings';
    browseControls.style.display = tab === 'browse' ? '' : 'none';
    resultsBar.style.display = tab === 'browse' ? '' : 'none';

    if (tab === 'lists') renderMyLists();
    if (tab === 'hearings') loadHearings();
  }

  function bindEvents() {
    // Login button (event delegation — button is dynamically rendered)
    document.getElementById('bt-user-badge').addEventListener('click', (e) => {
      if (e.target.id === 'bt-login-btn' || e.target.closest('#bt-login-btn')) {
        const loginUrl = `${AUTH_API}/login?app_id=cactus-watch&redirect_uri=${encodeURIComponent('https://cactus.watch/auth/callback')}`;
        window.location.href = loginUrl;
        return;
      }
      if (e.target.id === 'bt-logout-btn' || e.target.closest('#bt-logout-btn')) {
        logout();
        return;
      }
    });

    // Tab navigation
    document.querySelectorAll('.bt-nav-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Search (debounced)
    document.getElementById('bt-search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        state.currentPage = 1;
        loadBills();
      }, 350);
    });

    // Filter selects
    for (const id of ['bt-filter-chamber', 'bt-filter-status', 'bt-filter-type', 'bt-filter-sort']) {
      document.getElementById(id).addEventListener('change', (e) => {
        state.filters[id.replace('bt-filter-', '')] = e.target.value;
        state.currentPage = 1;
        loadBills();
      });
    }

    // Hearing filter toggle
    const hearingFilter = document.getElementById('bt-filter-hearing');
    if (hearingFilter) {
      hearingFilter.addEventListener('change', () => {
        state.filters.hearing = hearingFilter.checked;
        state.currentPage = 1;
        loadBills();
      });
    }

    // Hearings tab filters
    const hearingsChamber = document.getElementById('bt-hearings-chamber');
    if (hearingsChamber) {
      hearingsChamber.addEventListener('change', () => {
        hearingsState.chamber = hearingsChamber.value;
        loadHearings();
      });
    }
    const hearingsCommittee = document.getElementById('bt-hearings-committee');
    if (hearingsCommittee) {
      hearingsCommittee.addEventListener('change', () => {
        hearingsState.committee = hearingsCommittee.value;
        if (hearingsState.data) renderHearings(hearingsState.data);
      });
    }
    // Hearings search box
    const hearingsSearch = document.getElementById('bt-hearings-search');
    if (hearingsSearch) {
      let searchTimer = null;
      hearingsSearch.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          hearingsState.search = hearingsSearch.value.trim();
          if (hearingsState.data) renderHearings(hearingsState.data);
        }, 300);
      });
    }
    const hearingsOrg = document.getElementById('bt-hearings-org');
    if (hearingsOrg) {
      hearingsOrg.addEventListener('change', () => {
        hearingsState.org = hearingsOrg.value;
        if (hearingsState.data) renderHearings(hearingsState.data);
      });
    }

    // Bill card clicks (delegated)
    document.getElementById('bt-bill-list').addEventListener('click', (e) => {
      // Add-to-list button
      const addBtn = e.target.closest('.bt-card-add');
      if (addBtn) {
        e.stopPropagation();
        showListPopover(addBtn, addBtn.dataset.number);
        return;
      }
      // Card click → detail
      const card = e.target.closest('.bt-bill-card');
      if (card) openBillDetail(card.querySelector('.bt-card-number').textContent.trim());
    });

    document.getElementById('bt-bill-list').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.bt-bill-card');
        if (card) openBillDetail(card.querySelector('.bt-card-number').textContent.trim());
      }
    });

    // Pagination
    document.getElementById('bt-pagination').addEventListener('click', (e) => {
      const btn = e.target.closest('.bt-page-btn');
      if (btn && !btn.disabled) {
        state.currentPage = parseInt(btn.dataset.page, 10);
        loadBills();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Clear filters
    document.getElementById('bt-results-bar').addEventListener('click', (e) => {
      if (e.target.id === 'bt-clear-filters') clearFilters();
    });

    // Detail overlay close
    document.getElementById('bt-detail-close').addEventListener('click', closeDetail);
    document.getElementById('bt-overlay-backdrop').addEventListener('click', closeDetail);

    // Create list button
    document.getElementById('bt-create-list').addEventListener('click', () => {
      const name = prompt('List name:');
      if (name?.trim()) {
        tracking.createList(name.trim());
        renderMyLists();
        updateListsBadge();
      }
    });

    // Settings menu toggle
    document.getElementById('bt-lists-settings').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('bt-lists-settings-menu');
      menu.hidden = !menu.hidden;
      if (!menu.hidden) renderMyLists(); // refresh delete list options
    });

    // Toggle archived bills
    document.getElementById('bt-toggle-archived').addEventListener('click', () => {
      listsUIState.showArchived = !listsUIState.showArchived;
      document.getElementById('bt-lists-settings-menu').hidden = true;
      renderMyLists();
    });

    // Delete list from settings menu (delegated)
    document.getElementById('bt-settings-delete-lists').addEventListener('click', (e) => {
      const btn = e.target.closest('.bt-settings-delete-list');
      if (!btn) return;
      if (confirm('Delete this list? This cannot be undone.')) {
        tracking.deleteList(btn.dataset.listId);
        document.getElementById('bt-lists-settings-menu').hidden = true;
        renderMyLists();
        updateListsBadge();
      }
    });

    // Close settings menu on outside click
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('bt-lists-settings-menu');
      if (!menu.hidden && !e.target.closest('.bt-lists-settings-wrap')) {
        menu.hidden = true;
      }
    });

    // List popover: new list
    document.getElementById('bt-list-popover-new').addEventListener('click', () => {
      const createEl = document.getElementById('bt-list-popover-create');
      createEl.hidden = false;
      document.getElementById('bt-list-popover-input').focus();
    });

    document.getElementById('bt-list-popover-save').addEventListener('click', () => {
      const input = document.getElementById('bt-list-popover-input');
      const name = input.value.trim();
      if (!name) return;
      const listId = tracking.createList(name);
      if (activePopoverBill) {
        const bill = state.billCache[activePopoverBill];
        if (bill) tracking.addToList(listId, bill);
      }
      input.value = '';
      document.getElementById('bt-list-popover-create').hidden = true;
      // Refresh popover
      if (activePopoverBill) {
        const anchor = document.querySelector(`.bt-card-add[data-number="${activePopoverBill}"]`) ||
                        document.querySelector('.bt-detail-add-btn');
        if (anchor) showListPopover(anchor, activePopoverBill);
      }
      updateListsBadge();
    });

    // Enter key on popover input
    document.getElementById('bt-list-popover-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('bt-list-popover-save').click();
    });

    // Close popover on outside click
    document.addEventListener('click', (e) => {
      const popover = document.getElementById('bt-list-popover');
      if (!popover.hidden && !popover.contains(e.target) && !e.target.closest('.bt-card-add') && !e.target.closest('.bt-detail-add-btn')) {
        hideListPopover();
      }
    });

    // Escape closes everything
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!document.getElementById('bt-list-popover').hidden) { hideListPopover(); return; }
        closeDetail();
      }
    });
  }

  async function openBillDetail(number) {
    const overlay = document.getElementById('bt-overlay');
    const body = document.getElementById('bt-detail-body');
    body.innerHTML = '<div class="bt-loading"><div class="bt-spinner"></div><p>Loading...</p></div>';
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    try {
      const bill = await loadBillDetail(number);
      renderBillDetail(bill);
      showTimeline(bill);
    } catch (err) {
      console.error('Failed to load bill detail:', err);
      body.innerHTML = `<div class="bt-empty"><div class="bt-empty-icon">&#9888;&#65039;</div><div class="bt-empty-text">Failed to load bill detail</div></div>`;
    }
  }

  function closeDetail() {
    const overlay = document.getElementById('bt-overlay');
    if (overlay.hidden) return;
    hideTimeline();
    overlay.hidden = true;
    document.body.style.overflow = '';
    // Refresh list view if active (tracking may have changed)
    if (state.activeTab === 'lists') renderMyLists();
    // Refresh bill cards to update tracked indicators
    if (state.activeTab === 'browse') loadBills();
  }

  function clearFilters() {
    state.filters = { search: '', chamber: '', status: '', type: '', hearing: false, sort: 'updated_at', order: 'desc' };
    state.currentPage = 1;
    document.getElementById('bt-search').value = '';
    document.getElementById('bt-filter-chamber').value = '';
    document.getElementById('bt-filter-status').value = '';
    document.getElementById('bt-filter-type').value = '';
    document.getElementById('bt-filter-sort').value = 'updated_at';
    const hearingCb = document.getElementById('bt-filter-hearing');
    if (hearingCb) hearingCb.checked = false;
    loadBills();
  }

  /* ============================================================
     Feedback Modal
     ============================================================ */

  function initFeedback() {
    const fab = document.getElementById('bt-feedback-fab');
    const overlay = document.getElementById('bt-feedback-overlay');
    const closeBtn = document.getElementById('bt-feedback-close');
    const submitBtn = document.getElementById('bt-feedback-submit');
    const emailInput = document.getElementById('bt-feedback-email');

    if (!fab) return;

    fab.addEventListener('click', () => {
      overlay.classList.add('bt-feedback--open');
      // Autofill email if logged in
      if (isLoggedIn() && state.user.email && !emailInput.value) {
        emailInput.value = state.user.email;
      }
    });

    const closeFeedback = () => overlay.classList.remove('bt-feedback--open');
    closeBtn.addEventListener('click', closeFeedback);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeFeedback();
    });

    submitBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const category = document.getElementById('bt-feedback-category').value;
      const message = document.getElementById('bt-feedback-message').value.trim();
      const wantsResponse = document.getElementById('bt-feedback-response').checked;
      const statusEl = document.getElementById('bt-feedback-status');

      if (!email || !email.includes('@')) {
        statusEl.hidden = false;
        statusEl.className = 'bt-feedback-status bt-feedback-status--error';
        statusEl.textContent = 'Please enter a valid email address.';
        return;
      }
      if (!message || message.length < 5) {
        statusEl.hidden = false;
        statusEl.className = 'bt-feedback-status bt-feedback-status--error';
        statusEl.textContent = 'Please enter a message (at least 5 characters).';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      statusEl.hidden = true;

      try {
        const resp = await fetch(`${state.apiBase}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, category, message, wantsResponse }),
        });

        if (resp.ok) {
          statusEl.hidden = false;
          statusEl.className = 'bt-feedback-status bt-feedback-status--success';
          statusEl.textContent = 'Feedback sent! Thank you.';
          document.getElementById('bt-feedback-message').value = '';
          setTimeout(() => { closeFeedback(); statusEl.hidden = true; }, 2000);
        } else {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to send');
        }
      } catch (err) {
        statusEl.hidden = false;
        statusEl.className = 'bt-feedback-status bt-feedback-status--error';
        statusEl.textContent = `Failed to send: ${err.message}`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Feedback';
      }
    });
  }

  /* ============================================================
     Boot
     ============================================================ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
// v6
