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

  const LIVE_API = 'https://cactus-watch-central.alex-logvin.workers.dev';
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
    W: 'Withdrawn', H: 'Held', RP: 'Referred', PASSED: 'Passed', FAILED: 'Failed',
  };

  const TRACK_TYPE_LABELS = {
    rts_comment: 'RTS Comment',
    vote_only: 'Vote Only',
    watching: 'Watching',
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
            item.rtsComment = ''; // Clear RTS comment
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
          if (item.needsAttention) count++;
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
          ${bill.azleg_url ? `<a href="${esc(bill.azleg_url)}" target="_blank" rel="noopener" class="bt-detail-azleg">View on azleg.gov &rarr;</a>` : ''}
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
  }

  function renderDetailTracking(bill, lists) {
    // Use first list's item for tracking info
    const firstList = lists[0];
    const item = firstList.items[bill.number];
    const listNames = lists.map(l => l.name).join(', ');

    let html = `<div class="bt-detail-tracking">
      <div class="bt-detail-tracking-title">&#128204; Tracking</div>
      <div class="bt-detail-tracking-lists">On: <strong>${esc(listNames)}</strong></div>`;

    // Status change alert
    if (item.needsAttention) {
      html += `<div class="bt-status-alert"><span class="bt-status-alert-icon">&#9888;&#65039;</span>Status changed to <strong>${statusLabel(bill.status)}</strong> — please update your RTS comment</div>`;
    }

    // Tracking type selector
    html += `<div class="bt-track-type-selector">
      ${Object.entries(TRACK_TYPE_LABELS).map(([key, label]) =>
        `<button class="bt-track-type-btn ${item.trackingType === key ? 'bt-track-type-btn--active' : ''}" data-type="${key}" data-list="${firstList.id}" data-number="${bill.number}">${label}</button>`
      ).join('')}
    </div>`;

    // RTS Comment area (visible for rts_comment type)
    if (item.trackingType === 'rts_comment') {
      html += `<div class="bt-rts-section">
        <div class="bt-rts-label">RTS Comment Draft</div>
        <textarea class="bt-rts-textarea" id="bt-rts-textarea" data-list="${firstList.id}" data-number="${bill.number}" placeholder="Write your Request to Speak comment here...">${esc(item.rtsComment)}</textarea>
        <div class="bt-rts-hint">This comment will be cleared when the bill's status changes, so you can draft a fresh one for the new hearing.</div>
      </div>`;
    }

    html += `</div>`;
    return html;
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

    // Tracking type buttons
    body.querySelectorAll('.bt-track-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { type, list, number } = btn.dataset;
        tracking.updateItem(list, number, { trackingType: type, needsAttention: false });
        renderBillDetail(bill); // Re-render to show/hide RTS area
      });
    });

    // RTS comment auto-save
    const textarea = body.querySelector('#bt-rts-textarea');
    if (textarea) {
      let saveTimer = null;
      textarea.addEventListener('input', () => {
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
     Rendering — My Lists View
     ============================================================ */

  function renderMyLists() {
    const container = document.getElementById('bt-lists-container');
    const attentionEl = document.getElementById('bt-lists-attention');
    const lists = tracking.getListArray();

    // Attention summary
    const attentionCount = tracking.getAttentionCount();
    attentionEl.innerHTML = attentionCount > 0
      ? `<div class="bt-attention-banner"><span class="bt-attention-banner-icon">&#9888;&#65039;</span>${attentionCount} bill${attentionCount !== 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} attention — status changed, RTS comments cleared</div>`
      : '';

    if (lists.length === 0) {
      container.innerHTML = `<div class="bt-empty"><div class="bt-empty-icon">&#128203;</div><div class="bt-empty-text">No lists yet</div><div class="bt-empty-sub">Create a list and start tracking bills while browsing</div></div>`;
      return;
    }

    container.innerHTML = lists.map(list => renderListCard(list)).join('');
    bindListEvents(container);
  }

  function renderListCard(list) {
    const items = Object.values(list.items);
    const attentionItems = items.filter(i => i.needsAttention);
    const rtsItems = items.filter(i => i.trackingType === 'rts_comment');
    const voteItems = items.filter(i => i.trackingType === 'vote_only');
    const watchItems = items.filter(i => i.trackingType === 'watching');

    let html = `<div class="bt-list-card" data-list-id="${list.id}">
      <div class="bt-list-card-header">
        <div>
          <span class="bt-list-card-name">${esc(list.name)}</span>
          <span class="bt-list-card-count">${items.length} bill${items.length !== 1 ? 's' : ''}${rtsItems.length ? ` &middot; ${rtsItems.length} RTS` : ''}${voteItems.length ? ` &middot; ${voteItems.length} Vote` : ''}${watchItems.length ? ` &middot; ${watchItems.length} Watch` : ''}</span>
        </div>
        <div class="bt-list-card-actions">
          <button class="bt-btn bt-btn--small bt-btn--danger bt-delete-list" data-list-id="${list.id}" title="Delete list">&#128465;</button>
        </div>
      </div>`;

    if (items.length === 0) {
      html += `<div class="bt-list-empty">No bills tracked yet. Browse bills and click + to add them.</div>`;
    } else {
      // Show attention items first, then RTS, then vote, then watching
      const sorted = [...items].sort((a, b) => {
        if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
        const typeOrder = { rts_comment: 0, vote_only: 1, watching: 2 };
        return (typeOrder[a.trackingType] || 3) - (typeOrder[b.trackingType] || 3);
      });

      html += sorted.map(item => renderTrackedBill(list.id, item)).join('');
    }

    html += `</div>`;
    return html;
  }

  function renderTrackedBill(listId, item) {
    const bill = state.billCache[item.number];
    const title = bill?.short_title || bill?.description || '';

    let html = `<div class="bt-tracked-bill ${item.needsAttention ? 'bt-tracked-bill--attention' : ''}">
      <div class="bt-tracked-info">
        <div class="bt-tracked-header">
          <span class="bt-tracked-number" data-number="${esc(item.number)}">${esc(item.number)}</span>
          <span class="bt-status bt-status--${esc(item.lastKnownStatus)}" style="font-size: 11px; padding: 2px 8px;">${statusLabel(item.lastKnownStatus)}</span>
          <span class="bt-track-type bt-track-type--${item.trackingType}">${TRACK_TYPE_LABELS[item.trackingType]}</span>
        </div>
        ${title ? `<div class="bt-tracked-title">${esc(title)}</div>` : ''}`;

    // Status change alert
    if (item.needsAttention) {
      html += `<div class="bt-status-alert"><span class="bt-status-alert-icon">&#9888;&#65039;</span>Status changed — update your RTS comment</div>`;
    }

    // RTS comment inline (for rts_comment type)
    if (item.trackingType === 'rts_comment') {
      html += `<div class="bt-rts-section">
        <div class="bt-rts-label">RTS Comment Draft</div>
        <textarea class="bt-rts-textarea bt-list-rts" data-list="${listId}" data-number="${esc(item.number)}" placeholder="Write your RTS comment...">${esc(item.rtsComment)}</textarea>
      </div>`;
    }

    html += `</div>
      <div class="bt-tracked-actions">
        <button class="bt-btn bt-btn--small bt-remove-from-list" data-list="${listId}" data-number="${esc(item.number)}" title="Remove from list">&times;</button>
      </div>
    </div>`;
    return html;
  }

  function bindListEvents(container) {
    // Delete list
    container.querySelectorAll('.bt-delete-list').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`Delete list? This cannot be undone.`)) {
          tracking.deleteList(btn.dataset.listId);
          renderMyLists();
          updateListsBadge();
        }
      });
    });

    // Remove bill from list
    container.querySelectorAll('.bt-remove-from-list').forEach(btn => {
      btn.addEventListener('click', () => {
        tracking.removeFromList(btn.dataset.list, btn.dataset.number);
        renderMyLists();
        updateListsBadge();
      });
    });

    // Click bill number to open detail
    container.querySelectorAll('.bt-tracked-number').forEach(el => {
      el.addEventListener('click', () => openBillDetail(el.dataset.number));
    });

    // RTS comment auto-save
    container.querySelectorAll('.bt-list-rts').forEach(textarea => {
      let timer = null;
      textarea.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          tracking.updateItem(textarea.dataset.list, textarea.dataset.number, {
            rtsComment: textarea.value,
            needsAttention: false,
          });
          updateListsBadge();
        }, 500);
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
    } catch (err) {
      console.error('Failed to load bill detail:', err);
      body.innerHTML = `<div class="bt-empty"><div class="bt-empty-icon">&#9888;&#65039;</div><div class="bt-empty-text">Failed to load bill detail</div></div>`;
    }
  }

  function closeDetail() {
    const overlay = document.getElementById('bt-overlay');
    if (overlay.hidden) return;
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
