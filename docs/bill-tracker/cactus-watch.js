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
  const DEMO_DATA_PATH = 'demo-data';
  const PAGE_SIZE = 25;
  const STORAGE_KEY = 'cactus-watch-tracking';

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
    filters: { search: '', chamber: '', status: '', type: '', sort: 'updated_at', order: 'desc' },
    billCache: {},  // number → bill data from list/API
  };

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
        trackingType: 'watching',
        position: null, // 'for', 'neutral', 'against'
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

    /** Check all tracked bills against current data, clear RTS on status change */
    checkStatusChanges(billMap) {
      const data = this.load();
      let changed = false;
      for (const list of Object.values(data.lists)) {
        for (const item of Object.values(list.items)) {
          const current = billMap[item.number];
          if (!current) continue;
          if (current.status !== item.lastKnownStatus) {
            item.needsAttention = true;
            item.statusChangedAt = new Date().toISOString();
            item.lastKnownStatus = current.status;
            item.lastKnownAction = current.last_action || '';
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
  };

  /* ============================================================
     Initialization
     ============================================================ */

  function detectMode() {
    const scriptEl = document.querySelector('script[src*="cactus-watch"]');
    const dataApi = scriptEl?.getAttribute('data-api');
    if (dataApi) { state.mode = 'production'; state.apiBase = dataApi; return; }

    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('api');
    if (apiParam) { state.mode = 'production'; state.apiBase = apiParam; return; }
    if (params.has('demo')) { state.mode = 'demo'; return; }

    const host = window.location.hostname;
    if (host.endsWith('github.io') || host === '' || host === 'localhost' || host === '127.0.0.1') {
      state.mode = 'demo';
      return;
    }
    state.mode = 'production';
  }

  async function init() {
    detectMode();
    if (state.mode === 'demo') document.getElementById('bt-demo-banner').hidden = false;

    tracking.load();
    renderUserBadge();
    bindEvents();
    await loadMeta();
    await loadBills();
    updateListsBadge();
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
      tracking.checkStatusChanges(state.billCache);

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
    const { search, chamber, status, type, sort, order } = state.filters;
    if (search) params.set('search', search);
    if (chamber) params.set('chamber', chamber);
    if (status) params.set('status', status);
    if (type) params.set('type', type);
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

  function statusLabel(s) { return STATUS_LABELS[s] || s; }
  function typeLabel(t) { return TYPE_LABELS[t] || t; }
  function actionLabel(a) { return COMMITTEE_ACTIONS[a] || a; }
  function committeeName(ca) { return PROCEDURAL_NAMES[ca.committee_short] || ca.committee_name; }

  /* ============================================================
     Rendering — Header & Meta
     ============================================================ */

  function renderUserBadge() {
    const user = tracking.getUser();
    const el = document.getElementById('bt-user-badge');
    const initial = user.name.charAt(0).toUpperCase();
    el.innerHTML = `<span class="bt-user-avatar">${initial}</span><span>${esc(user.name)}</span>`;
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
      const isTracked = tracking.isTracked(bill.number);
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
          <span class="bt-status bt-status--${esc(bill.status)}">${statusLabel(bill.status)}</span>
          <button class="bt-card-add ${isTracked ? 'bt-card-add--tracked' : ''}" data-number="${esc(bill.number)}" aria-label="Add ${esc(bill.number)} to list" title="${isTracked ? 'On a list' : 'Add to list'}">
            ${isTracked ? '&#10003;' : '+'}
          </button>
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
    const hasFilters = state.filters.search || state.filters.chamber || state.filters.status || state.filters.type;
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

    const listsForBill = tracking.getListsForBill(bill.number);
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
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
          ${bill.azleg_url ? `<a href="${esc(bill.azleg_url)}" target="_blank" rel="noopener" class="bt-btn bt-btn--small bt-detail-azleg">&#127963; View on AZLeg.gov &rarr;</a>` : ''}
          <button class="bt-btn bt-btn--small bt-detail-add-btn" data-number="${esc(bill.number)}">${isTracked ? '&#10003; On list' : '+ Add to list'}</button>
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

    body.innerHTML = html;
    bindDetailEvents(body, bill);

    // Load RTS agenda data asynchronously (only if bill is tracked)
    if (tracking.isTracked(bill.number)) {
      loadRtsAgendas(bill.number);
    }
  }

  function renderDetailTracking(bill, lists) {
    // Use first list's item for tracking info
    const firstList = lists[0];
    const item = firstList.items[bill.number];
    const listNames = lists.map(l => l.name).join(', ');
    const userActions = tracking.getBillActions(bill.number);

    let html = `<div class="bt-detail-tracking">
      <div class="bt-detail-tracking-title">&#128204; Tracking</div>
      <div class="bt-detail-tracking-lists">On: <strong>${esc(listNames)}</strong></div>`;

    // Status change alert
    if (item.needsAttention) {
      html += `<div class="bt-status-alert"><span class="bt-status-alert-icon">&#9888;&#65039;</span>Status changed to <strong>${statusLabel(bill.status)}</strong> — re-submit your RTS comment on azleg.gov</div>`;
    }

    // Position selector (For / Neutral / Against)
    html += `<div class="bt-position-row">
      <span class="bt-position-label">My Position:</span>
      <div class="bt-position-selector">
        ${Object.entries(POSITION_LABELS).map(([key, label]) =>
          `<button class="bt-position-btn bt-position-btn--${key} ${item.position === key ? 'bt-position-btn--active' : ''}" data-position="${key}" data-list="${firstList.id}" data-number="${bill.number}">${label}</button>`
        ).join('')}
      </div>
    </div>`;

    // Tracking type selector
    html += `<div class="bt-track-type-selector">
      ${Object.entries(TRACK_TYPE_LABELS).map(([key, label]) =>
        `<button class="bt-track-type-btn ${item.trackingType === key ? 'bt-track-type-btn--active' : ''}" data-type="${key}" data-list="${firstList.id}" data-number="${bill.number}">${label}</button>`
      ).join('')}
    </div>`;

    // RTS Comment area (visible for rts_comment type)
    if (item.trackingType === 'rts_comment') {
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

    // RTS agenda links — populated asynchronously
    html += `<div class="bt-rts-agendas" id="bt-rts-agendas" data-bill="${esc(bill.number)}"></div>`;

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
      if (actions.voted && actions.voted_date) {
        const positionLabel = bill ? '' : '';
        entries.push({
          date: formatDate(actions.voted_date),
          text: `RTS Vote — ${stage.label}`,
          timestamp: actions.voted_date,
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

          // User action checkboxes
          if (stage.actionable && stage.phase !== 'future' && isTracked && (trackingType === 'rts_comment' || trackingType === 'vote_only')) {
            const actions = userActions[stage.id] || {};
            html += `<div class="bt-tl-actions">`;

            if (stage.type === 'committee') {
              if (trackingType === 'rts_comment') {
                html += `<label class="bt-tl-action">
                  <input type="checkbox" class="bt-tl-checkbox" data-bill="${esc(bill.number)}" data-stage="${stage.id}" data-action="commented" ${actions.commented ? 'checked' : ''}>
                  <span>I left an RTS Comment</span>
                </label>`;
              }
              html += `<label class="bt-tl-action">
                <input type="checkbox" class="bt-tl-checkbox" data-bill="${esc(bill.number)}" data-stage="${stage.id}" data-action="voted" ${actions.voted ? 'checked' : ''}>
                <span>I left an RTS Vote</span>
              </label>`;
            }

            if (stage.type === 'vote') {
              html += `<label class="bt-tl-action">
                <input type="checkbox" class="bt-tl-checkbox" data-bill="${esc(bill.number)}" data-stage="${stage.id}" data-action="voted" ${actions.voted ? 'checked' : ''}>
                <span>I left an RTS Vote</span>
              </label>`;
            }

            html += `</div>`;
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
    renderTimeline(bill);
    document.getElementById('bt-timeline').classList.add('bt-timeline--open');
  }

  function hideTimeline() {
    document.getElementById('bt-timeline').classList.remove('bt-timeline--open');
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
      html += `<button class="bt-vote-toggle" aria-controls="${recordsId}">Show individual votes</button>
        <div class="bt-vote-records" id="${recordsId}"><div class="bt-vote-grid">${vote.records.map(r => `
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

    // Position buttons
    body.querySelectorAll('.bt-position-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = btn.dataset.position;
        const lists = tracking.getListsForBill(bill.number);
        // Toggle off if already selected, otherwise set
        const newPosition = lists[0]?.items[bill.number]?.position === current ? null : current;
        for (const list of lists) {
          tracking.updateItem(list.id, bill.number, { position: newPosition });
        }
        renderBillDetail(bill);
        showTimeline(bill); // Re-render timeline too
      });
    });

    // Tracking type buttons
    body.querySelectorAll('.bt-track-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { type, list, number } = btn.dataset;
        tracking.updateItem(list, number, { trackingType: type, needsAttention: false });
        renderBillDetail(bill);
        showTimeline(bill); // Re-render timeline too
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
     RTS Agenda Fetcher — populates deep links asynchronously
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
  const listsUIState = { expanded: {}, showArchived: false };

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
  }

  function renderListCard(list) {
    const allItems = Object.values(list.items);
    const activeItems = allItems.filter(i => !i.archived);
    const archivedItems = allItems.filter(i => i.archived);
    const visibleItems = listsUIState.showArchived ? allItems : activeItems;
    const rtsItems = activeItems.filter(i => i.trackingType === 'rts_comment');
    const voteItems = activeItems.filter(i => i.trackingType === 'vote_only');
    const watchItems = activeItems.filter(i => i.trackingType === 'watching');
    const isExpanded = !!listsUIState.expanded[list.id];

    let html = `<div class="bt-list-card ${isExpanded ? 'bt-list-card--expanded' : ''}" data-list-id="${list.id}">
      <div class="bt-list-card-header bt-list-card-toggle" data-list-id="${list.id}" role="button" aria-expanded="${isExpanded}" tabindex="0">
        <div class="bt-list-card-header-left">
          <span class="bt-list-card-chevron" aria-hidden="true">${isExpanded ? '&#9660;' : '&#9654;'}</span>
          <span class="bt-list-card-name">${esc(list.name)}</span>
          <span class="bt-list-card-count">${activeItems.length} bill${activeItems.length !== 1 ? 's' : ''}${rtsItems.length ? ` &middot; ${rtsItems.length} RTS` : ''}${voteItems.length ? ` &middot; ${voteItems.length} Vote` : ''}${watchItems.length ? ` &middot; ${watchItems.length} Watch` : ''}${archivedItems.length ? ` &middot; ${archivedItems.length} archived` : ''}</span>
        </div>
        ${activeItems.some(i => i.needsAttention) ? '<span class="bt-list-card-attention">&#9888;&#65039;</span>' : ''}
      </div>`;

    if (isExpanded) {
      if (visibleItems.length === 0) {
        html += `<div class="bt-list-empty">${listsUIState.showArchived ? 'No bills in this list.' : 'No active bills. Browse bills and click + to add them.'}</div>`;
      } else {
        // Show attention items first, then RTS, then vote, then watching; archived last
        const sorted = [...visibleItems].sort((a, b) => {
          if (a.archived !== b.archived) return a.archived ? 1 : -1;
          if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
          const typeOrder = { rts_comment: 0, vote_only: 1, watching: 2 };
          return (typeOrder[a.trackingType] || 3) - (typeOrder[b.trackingType] || 3);
        });

        html += sorted.map(item => renderTrackedBill(list.id, item)).join('');
      }
    }

    html += `</div>`;
    return html;
  }

  function renderTrackedBill(listId, item) {
    const bill = state.billCache[item.number];
    const title = bill?.short_title || bill?.description || '';
    const isArchived = !!item.archived;
    const posClass = item.position ? `bt-position-badge--${item.position}` : '';

    let html = `<div class="bt-tracked-bill ${item.needsAttention ? 'bt-tracked-bill--attention' : ''} ${isArchived ? 'bt-tracked-bill--archived' : ''}" data-bill-number="${esc(item.number)}">
      <div class="bt-tracked-info">
        <div class="bt-tracked-header">
          <span class="bt-tracked-number" data-number="${esc(item.number)}">${esc(item.number)}</span>
          ${item.position ? `<span class="bt-position-badge ${posClass}">${POSITION_LABELS[item.position]}</span>` : ''}
          <span class="bt-status bt-status--${esc(item.lastKnownStatus)}" style="font-size: 11px; padding: 2px 8px;">${statusLabel(item.lastKnownStatus)}</span>
          <span class="bt-track-type bt-track-type--${item.trackingType}">${TRACK_TYPE_LABELS[item.trackingType]}</span>
          ${isArchived ? '<span class="bt-track-type bt-track-type--archived">Archived</span>' : ''}
        </div>
        ${title ? `<div class="bt-tracked-title">${esc(title)}</div>` : ''}`;

    // Status change alert (only for active items)
    if (item.needsAttention && !isArchived) {
      html += `<div class="bt-status-alert"><span class="bt-status-alert-icon">&#9888;&#65039;</span>Status changed — re-submit your RTS on azleg.gov</div>`;
    }

    // Read-only RTS comment (only if has content, not archived)
    if (item.trackingType === 'rts_comment' && item.rtsComment && !isArchived) {
      html += `<div class="bt-rts-section bt-rts-section--readonly">
        <div class="bt-rts-label">My RTS Comment</div>
        <div class="bt-rts-readonly">${esc(item.rtsComment)}</div>
      </div>`;
    }

    // Read-only notes (only if has content, not archived)
    if (item.notes && !isArchived) {
      html += `<div class="bt-rts-section bt-rts-section--readonly">
        <div class="bt-rts-label">My Notes</div>
        <div class="bt-rts-readonly">${esc(item.notes)}</div>
      </div>`;
    }

    html += `</div>
      <div class="bt-tracked-actions">
        ${isArchived
          ? `<button class="bt-btn bt-btn--small bt-unarchive-bill" data-list="${listId}" data-number="${esc(item.number)}">Restore</button>
             <button class="bt-btn bt-btn--small bt-btn--danger bt-remove-from-list" data-list="${listId}" data-number="${esc(item.number)}">Remove</button>`
          : `<button class="bt-btn bt-btn--small bt-archive-bill" data-list="${listId}" data-number="${esc(item.number)}">Archive</button>
             <button class="bt-btn bt-btn--small bt-btn--danger bt-remove-from-list" data-list="${listId}" data-number="${esc(item.number)}">Remove</button>`
        }
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

    // Remove bill from list (with confirmation)
    container.querySelectorAll('.bt-remove-from-list').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Remove ${btn.dataset.number} from this list permanently?\n\nIf you just want to hide it, use Archive instead.`)) {
          tracking.removeFromList(btn.dataset.list, btn.dataset.number);
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

    // Click anywhere on tracked bill row to open detail
    container.querySelectorAll('.bt-tracked-bill').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking buttons
        if (e.target.closest('.bt-tracked-actions')) return;
        const number = row.dataset.billNumber;
        if (number) openBillDetail(number);
      });
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
    const browseControls = document.getElementById('bt-browse-controls');
    const resultsBar = document.getElementById('bt-results-bar');

    document.querySelectorAll('.bt-nav-tab').forEach(t => {
      const isActive = t.dataset.tab === tab;
      t.classList.toggle('bt-nav-tab--active', isActive);
      t.setAttribute('aria-selected', isActive);
    });

    if (tab === 'browse') {
      browseView.hidden = false;
      listsView.hidden = true;
      browseControls.style.display = '';
      resultsBar.style.display = '';
    } else {
      browseView.hidden = true;
      listsView.hidden = false;
      browseControls.style.display = 'none';
      resultsBar.style.display = 'none';
      renderMyLists();
    }
  }

  function bindEvents() {
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
    state.filters = { search: '', chamber: '', status: '', type: '', sort: 'updated_at', order: 'desc' };
    state.currentPage = 1;
    document.getElementById('bt-search').value = '';
    document.getElementById('bt-filter-chamber').value = '';
    document.getElementById('bt-filter-status').value = '';
    document.getElementById('bt-filter-type').value = '';
    document.getElementById('bt-filter-sort').value = 'updated_at';
    loadBills();
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
