/**
 * Cactus Watch — Arizona Bill Tracker Frontend
 *
 * Supports two modes:
 *   - Demo: reads static JSON from demo-data/ (client-side filtering)
 *   - Production: queries the live Cactus Watch API (server-side filtering)
 *
 * Configuration (in priority order):
 *   1. <script data-api="https://..."> attribute
 *   2. ?api=https://... URL parameter
 *   3. Auto-detect: GitHub Pages → demo, everything else → production
 */

(function () {
  'use strict';

  /* ============================================================
     Configuration
     ============================================================ */

  const LIVE_API = 'https://cactus-watch-central.alex-logvin.workers.dev';
  const DEMO_DATA_PATH = 'demo-data';
  const PAGE_SIZE = 25;

  const STATUS_LABELS = {
    introduced: 'Introduced',
    in_committee: 'In Committee',
    passed_committee: 'Passed Committee',
    on_floor: 'On Floor',
    passed_house: 'Passed House',
    passed_senate: 'Passed Senate',
    passed_both: 'Passed Both',
    to_governor: 'To Governor',
    signed: 'Signed',
    vetoed: 'Vetoed',
    dead: 'Dead',
    held: 'Held',
  };

  const TYPE_LABELS = {
    bill: 'Bill',
    memorial: 'Memorial',
    resolution: 'Resolution',
    concurrent_resolution: 'Concurrent Resolution',
    joint_resolution: 'Joint Resolution',
  };

  const COMMITTEE_ACTIONS = {
    DP: 'Do Pass',
    DPA: 'Do Pass, Amended',
    DPS: 'Do Pass, Substituted',
    DPAS: 'Do Pass, Amended & Substituted',
    PFC: 'Passed from Committee',
    W: 'Withdrawn',
    H: 'Held',
    RP: 'Referred',
    PASSED: 'Passed',
    FAILED: 'Failed',
  };

  /* ============================================================
     State
     ============================================================ */

  const state = {
    mode: 'production', // 'demo' or 'production'
    apiBase: LIVE_API,
    demoDataPath: DEMO_DATA_PATH,
    demoBills: null,     // cached demo bill list
    demoDetails: {},     // cached demo bill details
    meta: null,
    currentPage: 1,
    filters: { search: '', chamber: '', status: '', type: '', sort: 'updated_at', order: 'desc' },
    selectedBill: null,
  };

  /* ============================================================
     Initialization
     ============================================================ */

  function detectMode() {
    // 1. Check <script data-api> attribute
    const scriptEl = document.querySelector('script[src*="cactus-watch"]');
    const dataApi = scriptEl?.getAttribute('data-api');
    if (dataApi) {
      state.mode = 'production';
      state.apiBase = dataApi;
      return;
    }

    // 2. Check ?api= URL parameter
    const params = new URLSearchParams(window.location.search);
    const apiParam = params.get('api');
    if (apiParam) {
      state.mode = 'production';
      state.apiBase = apiParam;
      return;
    }

    // 3. Check ?demo parameter (force demo mode)
    if (params.has('demo')) {
      state.mode = 'demo';
      return;
    }

    // 4. Auto-detect: GitHub Pages or file:// → demo
    const host = window.location.hostname;
    if (host.endsWith('github.io') || host === '' || host === 'localhost' || host === '127.0.0.1') {
      state.mode = 'demo';
      return;
    }

    // 5. Default: production
    state.mode = 'production';
  }

  async function init() {
    detectMode();

    if (state.mode === 'demo') {
      document.getElementById('bt-demo-banner').hidden = false;
    }

    bindEvents();
    await loadMeta();
    await loadBills();
  }

  /* ============================================================
     Data Layer — abstracts demo (static JSON) vs production (API)
     ============================================================ */

  async function fetchJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${url}`);
    return resp.json();
  }

  /** Load session metadata */
  async function loadMeta() {
    try {
      if (state.mode === 'demo') {
        state.meta = await fetchJSON(`${state.demoDataPath}/meta.json`);
      } else {
        state.meta = await fetchJSON(`${state.apiBase}/api/meta`);
      }
      renderMeta();
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  }

  /** Load bill list with current filters */
  async function loadBills() {
    showLoading(true);

    try {
      let result;

      if (state.mode === 'demo') {
        result = await loadDemoBills();
      } else {
        result = await loadApiBills();
      }

      renderBillList(result.bills);
      renderPagination(result.pagination);
      renderResultsBar(result.pagination.total);
    } catch (err) {
      console.error('Failed to load bills:', err);
      renderError('Failed to load bills. Please try again.');
    } finally {
      showLoading(false);
    }
  }

  /** Load from live API with server-side filtering */
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

  /** Load from static demo JSON with client-side filtering */
  async function loadDemoBills() {
    // Cache the full list on first load
    if (!state.demoBills) {
      const data = await fetchJSON(`${state.demoDataPath}/bills.json`);
      state.demoBills = data.bills;
    }

    let filtered = [...state.demoBills];
    const { search, chamber, status, type, sort, order } = state.filters;

    // Filter
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

    // Sort
    const dir = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const va = (a[sort] || '').toString().toLowerCase();
      const vb = (b[sort] || '').toString().toLowerCase();
      return va < vb ? -dir : va > vb ? dir : 0;
    });

    // Paginate
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(state.currentPage, pages);
    const start = (page - 1) * PAGE_SIZE;
    const bills = filtered.slice(start, start + PAGE_SIZE);

    return {
      bills,
      pagination: { page, limit: PAGE_SIZE, total, pages },
    };
  }

  /** Load bill detail */
  async function loadBillDetail(number) {
    if (state.mode === 'demo') {
      // Try cached detail first, then the demo-data file, then fall back to list data
      if (state.demoDetails[number]) return state.demoDetails[number];
      try {
        const detail = await fetchJSON(`${state.demoDataPath}/bills/${number}.json`);
        state.demoDetails[number] = detail;
        return detail;
      } catch {
        // Fall back to the list item (no cosponsors/votes)
        return state.demoBills?.find(b => b.number === number) || null;
      }
    }
    return fetchJSON(`${state.apiBase}/api/bills/${number}`);
  }

  /* ============================================================
     Rendering
     ============================================================ */

  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
  }

  function statusLabel(s) { return STATUS_LABELS[s] || s; }
  function typeLabel(t) { return TYPE_LABELS[t] || t; }
  function actionLabel(a) { return COMMITTEE_ACTIONS[a] || a; }

  /** Render header stats */
  function renderMeta() {
    const el = document.getElementById('bt-meta-stats');
    if (!state.meta?.bills) { el.innerHTML = ''; return; }

    const { total, by_status } = state.meta.bills;
    const signed = by_status?.signed || 0;
    const vetoed = by_status?.vetoed || 0;
    const active = total - (signed + vetoed + (by_status?.dead || 0));

    el.innerHTML = `
      <div class="bt-meta-stat">
        <span class="bt-meta-stat-value">${total.toLocaleString()}</span>
        <span class="bt-meta-stat-label">Total Bills</span>
      </div>
      <div class="bt-meta-stat">
        <span class="bt-meta-stat-value">${active.toLocaleString()}</span>
        <span class="bt-meta-stat-label">Active</span>
      </div>
      <div class="bt-meta-stat">
        <span class="bt-meta-stat-value">${signed}</span>
        <span class="bt-meta-stat-label">Signed</span>
      </div>
      <div class="bt-meta-stat">
        <span class="bt-meta-stat-value">${vetoed}</span>
        <span class="bt-meta-stat-label">Vetoed</span>
      </div>
    `;
  }

  /** Render bill list */
  function renderBillList(bills) {
    const el = document.getElementById('bt-bill-list');

    if (!bills || bills.length === 0) {
      el.innerHTML = `
        <div class="bt-empty">
          <div class="bt-empty-icon">&#127797;</div>
          <div class="bt-empty-text">No bills found</div>
          <div class="bt-empty-sub">Try adjusting your filters or search terms</div>
        </div>
      `;
      return;
    }

    el.innerHTML = bills.map((bill, i) => `
      <article class="bt-bill-card" data-number="${esc(bill.number)}" style="animation-delay: ${Math.min(i * 30, 400)}ms" tabindex="0" role="button" aria-label="View ${esc(bill.number)}">
        <div class="bt-card-number">${esc(bill.number)}</div>
        <div class="bt-card-title">${esc(bill.short_title || bill.description || 'No title')}</div>
        <div class="bt-card-meta">
          <span class="bt-chamber">${bill.chamber === 'H' ? 'House' : 'Senate'}</span>
          ${bill.sponsor ? `<span><span class="bt-party bt-party--${esc(bill.sponsor_party)}"></span>${esc(bill.sponsor)}</span>` : ''}
          ${bill.last_action_date ? `<span>${formatDate(bill.last_action_date)}</span>` : ''}
        </div>
        <div class="bt-card-status">
          <span class="bt-status bt-status--${esc(bill.status)}">${statusLabel(bill.status)}</span>
        </div>
      </article>
    `).join('');
  }

  /** Render pagination */
  function renderPagination(pagination) {
    const el = document.getElementById('bt-pagination');
    if (!pagination || pagination.pages <= 1) { el.innerHTML = ''; return; }

    const { page, pages } = pagination;
    let html = '';

    // Previous
    html += `<button class="bt-page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">&laquo;</button>`;

    // Page numbers with ellipsis
    const range = buildPageRange(page, pages);
    for (const p of range) {
      if (p === '...') {
        html += `<span class="bt-page-ellipsis">&hellip;</span>`;
      } else {
        html += `<button class="bt-page-btn ${p === page ? 'bt-page-btn--active' : ''}" data-page="${p}">${p}</button>`;
      }
    }

    // Next
    html += `<button class="bt-page-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">&raquo;</button>`;

    el.innerHTML = html;
  }

  function buildPageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  /** Render results bar */
  function renderResultsBar(total) {
    const el = document.getElementById('bt-results-bar');
    const hasFilters = state.filters.search || state.filters.chamber || state.filters.status || state.filters.type;

    el.innerHTML = `
      <span><span class="bt-results-count">${total.toLocaleString()}</span> bill${total !== 1 ? 's' : ''} found</span>
      ${hasFilters ? `<button class="bt-results-clear" id="bt-clear-filters">Clear filters</button>` : ''}
    `;
  }

  /** Render bill detail panel */
  function renderBillDetail(bill) {
    const body = document.getElementById('bt-detail-body');
    if (!bill) { body.innerHTML = '<p>Bill not found.</p>'; return; }

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
        ${bill.azleg_url ? `<a href="${esc(bill.azleg_url)}" target="_blank" rel="noopener" class="bt-detail-azleg">View on azleg.gov &rarr;</a>` : ''}
      </div>
    `;

    // Cosponsors
    if (bill.cosponsors?.length) {
      html += `
        <div class="bt-detail-section">
          <h3 class="bt-detail-section-title">Cosponsors (${bill.cosponsors.length})</h3>
          <ul class="bt-cosponsor-list">
            ${bill.cosponsors.map(c => `
              <li class="bt-cosponsor">
                <span class="bt-party bt-party--${esc(c.party)}"></span>
                ${esc(c.name)}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Committee actions
    if (bill.committee_actions?.length) {
      html += `
        <div class="bt-detail-section">
          <h3 class="bt-detail-section-title">Committee Actions</h3>
          <ul class="bt-committee-list">
            ${bill.committee_actions.map(ca => `
              <li class="bt-committee-item">
                <div class="bt-committee-name">${esc(ca.committee_name)}</div>
                <div class="bt-committee-detail">
                  ${ca.action ? `<strong>${actionLabel(ca.action)}</strong>` : ''}
                  ${(ca.ayes != null && ca.nays != null) ? ` — ${ca.ayes} ayes, ${ca.nays} nays` : ''}
                  ${ca.action_date ? ` &middot; ${formatDate(ca.action_date)}` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Floor votes
    if (bill.votes?.length) {
      html += `
        <div class="bt-detail-section">
          <h3 class="bt-detail-section-title">Floor Votes</h3>
          ${bill.votes.map((v, vi) => renderVote(v, vi)).join('')}
        </div>
      `;
    }

    body.innerHTML = html;

    // Bind vote toggle buttons
    body.querySelectorAll('.bt-vote-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = body.querySelector(`#${btn.getAttribute('aria-controls')}`);
        const open = target.classList.toggle('bt-vote-records--open');
        btn.textContent = open ? 'Hide individual votes' : 'Show individual votes';
      });
    });
  }

  /** Render a single vote section */
  function renderVote(vote, index) {
    const total = (vote.yeas || 0) + (vote.nays || 0) + (vote.not_voting || 0) + (vote.excused || 0);
    if (total === 0) return '';

    const pctYea = ((vote.yeas / total) * 100).toFixed(1);
    const pctNay = ((vote.nays / total) * 100).toFixed(1);
    const pctNV = (((vote.not_voting || 0) / total) * 100).toFixed(1);
    const pctEx = (((vote.excused || 0) / total) * 100).toFixed(1);

    const resultClass = vote.result?.toLowerCase().includes('passed') ? 'passed' : 'failed';
    const recordsId = `bt-vote-records-${index}`;

    let html = `
      <div class="bt-vote">
        <div class="bt-vote-header">
          <span>${vote.chamber === 'H' ? 'House' : 'Senate'} &middot; ${formatDate(vote.vote_date)}</span>
          ${vote.result ? `<span class="bt-vote-result bt-vote-result--${resultClass}">${esc(vote.result)}</span>` : ''}
        </div>
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
        </div>
    `;

    // Individual vote records
    if (vote.records?.length) {
      html += `
        <button class="bt-vote-toggle" aria-controls="${recordsId}">Show individual votes</button>
        <div class="bt-vote-records" id="${recordsId}">
          <div class="bt-vote-grid">
            ${vote.records.map(r => `
              <div class="bt-vote-record">
                <span class="bt-vote-record-vote bt-vote-record-vote--${esc(r.vote)}">${esc(r.vote)}</span>
                <span class="bt-vote-record-name"><span class="bt-party bt-party--${esc(r.party)}"></span>${esc(r.legislator)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  function renderError(message) {
    document.getElementById('bt-bill-list').innerHTML = `
      <div class="bt-empty">
        <div class="bt-empty-icon">&#9888;&#65039;</div>
        <div class="bt-empty-text">${esc(message)}</div>
      </div>
    `;
  }

  function showLoading(show) {
    const loading = document.getElementById('bt-loading');
    const main = document.querySelector('.bt-main');
    loading.hidden = !show;
    if (main) main.style.display = show ? 'none' : '';
  }

  /* ============================================================
     Event Handling
     ============================================================ */

  let searchTimer = null;

  function bindEvents() {
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
        const key = id.replace('bt-filter-', '');
        state.filters[key] = e.target.value;
        state.currentPage = 1;
        loadBills();
      });
    }

    // Bill card clicks (delegated)
    document.getElementById('bt-bill-list').addEventListener('click', (e) => {
      const card = e.target.closest('.bt-bill-card');
      if (card) openBillDetail(card.dataset.number);
    });
    // Keyboard: Enter on bill card
    document.getElementById('bt-bill-list').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.bt-bill-card');
        if (card) openBillDetail(card.dataset.number);
      }
    });

    // Pagination clicks (delegated)
    document.getElementById('bt-pagination').addEventListener('click', (e) => {
      const btn = e.target.closest('.bt-page-btn');
      if (btn && !btn.disabled) {
        state.currentPage = parseInt(btn.dataset.page, 10);
        loadBills();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Clear filters (delegated)
    document.getElementById('bt-results-bar').addEventListener('click', (e) => {
      if (e.target.id === 'bt-clear-filters') clearFilters();
    });

    // Detail overlay close
    document.getElementById('bt-detail-close').addEventListener('click', closeDetail);
    document.getElementById('bt-overlay-backdrop').addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });
  }

  async function openBillDetail(number) {
    const overlay = document.getElementById('bt-overlay');
    const body = document.getElementById('bt-detail-body');

    body.innerHTML = '<div class="bt-loading"><div class="bt-spinner"></div><p>Loading bill detail...</p></div>';
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
