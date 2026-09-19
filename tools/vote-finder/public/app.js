/* Vote Finder — Maricopa County. Vanilla JS, no build step. */
(() => {
  'use strict';

  const TIERS = {
    early:  { color: 'var(--t-early)',  label: 'Open from Oct 7' },
    oct23:  { color: 'var(--t-oct23)',  label: 'Opens Oct 23' },
    oct31:  { color: 'var(--t-oct31)',  label: 'Opens Oct 31' },
    eve:    { color: 'var(--t-eve)',    label: 'Nov 2 and 3 only' },
    eday:   { color: 'var(--t-eday)',   label: 'Election Day only' },
    always: { color: 'var(--t-always)', label: 'Open 24 hours' },
    none:   { color: 'var(--t-none)',   label: 'No hours listed' },
  };
  const TIER_HEX = { early: '#1e7f5c', oct23: '#1f8a9e', oct31: '#d9930e', eve: '#e2641e', eday: '#c43d2f', always: '#6b4fbb', none: '#9aa1b1' };
  const MODE_LABELS = { vc: 'Vote in person', db: 'Drop off my ballot' };
  const MODE_HASH = { vc: 'in-person', db: 'drop-box' };
  const LATE_CUTOFF = 17 * 60;
  const PAGE_SIZE = 25;
  const MARICOPA_CENTER = [33.48, -112.1];
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    });
    children.flat().forEach((c) => { if (c !== null && c !== undefined) node.append(c); });
    return node;
  };

  /* ---------- schedule helpers (mirrors src/schedule.js) ---------- */
  const parseDate = (mdy) => { const [m, d, y] = mdy.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const formatDate = (mdy) => { const dt = parseDate(mdy); return `${DAY_NAMES[dt.getUTCDay()]}, ${MONTH_NAMES[dt.getUTCMonth()]} ${dt.getUTCDate()}`; };
  const shortDate = (mdy) => { const dt = parseDate(mdy); return `${MONTH_NAMES[dt.getUTCMonth()]} ${dt.getUTCDate()}`; };
  const formatTime = (mins) => {
    const h24 = Math.floor(mins / 60); const m = mins % 60; const suffix = h24 >= 12 ? 'pm' : 'am';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
  };
  const describeHours = (entry) => (entry === '24h' ? 'Open 24 hours' : Array.isArray(entry) ? `${formatTime(entry[0])} to ${formatTime(entry[1])}` : 'Closed');
  const isOpen = (entry) => entry === '24h' || Array.isArray(entry);
  const isLate = (entry) => entry === '24h' || (Array.isArray(entry) && entry[1] > LATE_CUTOFF);
  const phoenixNow = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t) => Number(parts.find((p) => p.type === t).value);
    return { mdy: `${get('month')}/${get('day')}/${get('year')}`, minutes: (get('hour') % 24) * 60 + get('minute') };
  };
  const haversineMiles = (a, b) => {
    const R = 3958.8; const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  /* ---------- state ---------- */
  const state = { data: null, config: null, mode: null, when: null, day: null, voter: null, filter: '', selectedId: null, shown: PAGE_SIZE, sitesById: new Map(), dayChosen: false };
  const WHEN_HASH = { early: 'early', eday: 'election-day' };
  const WHEN_LABELS = { early: 'Early voting', eday: 'Election Day' };
  /** Collapse a question to its answer row (text) or reopen it (null). */
  const setAnswer = (key, text) => {
    const answer = $(`vf-${key}-answer`); const body = $(`vf-${key}-body`);
    answer.hidden = text === null; body.hidden = text !== null;
    if (text !== null) answer.querySelector('.vf-answer-text').textContent = text;
  };
  const lastIndex = () => state.data.dates.length - 1;
  let map = null; let markers = new Map(); let youMarker = null;

  const hoursFor = (site, mode) => {
    const codes = mode === 'vc' ? site.vc : (site.db || site.vc);
    return codes ? codes.map((c) => state.data.legend[c]) : null;
  };
  const firstOpenIndex = (hours) => hours.findIndex(isOpen);
  const tierOf = (hours) => {
    if (!hours) return 'none';
    if (hours.filter((h) => h === '24h').length >= hours.length / 2) return 'always';
    const i = firstOpenIndex(hours);
    if (i < 0) return 'none';
    if (i <= 15) return 'early';
    if (i <= 23) return 'oct23';
    if (i <= 25) return 'oct31';
    if (i === 26) return 'eve';
    return 'eday';
  };
  const todayStatus = (hours) => {
    const { dates } = state.data; const now = phoenixNow();
    const idx = dates.indexOf(now.mdy);
    const nextOpenFrom = (from) => { const j = hours.findIndex((h, k) => k >= from && isOpen(h)); return j < 0 ? null : dates[j]; };
    if (idx < 0) {
      const beforeStart = parseDate(now.mdy) < parseDate(dates[0]);
      const next = beforeStart ? nextOpenFrom(0) : null;
      return next ? { cls: 'is-closed', text: `Opens ${formatDate(next)}` } : { cls: 'is-closed', text: beforeStart ? 'No hours listed' : 'Voting has ended' };
    }
    const entry = hours[idx];
    if (isOpen(entry)) {
      if (entry === '24h') return { cls: 'is-open', text: 'Open now, 24 hours' };
      if (now.minutes < entry[0]) return { cls: 'is-open', text: `Opens today at ${formatTime(entry[0])}` };
      if (now.minutes < entry[1]) return { cls: 'is-open', text: `Open now until ${formatTime(entry[1])}` };
      const next = nextOpenFrom(idx + 1);
      return { cls: 'is-closed', text: next ? `Closed for today. Opens ${formatDate(next)}` : 'Closed for today' };
    }
    const next = nextOpenFrom(idx + 1);
    return { cls: 'is-closed', text: next ? `Closed today. Opens ${formatDate(next)}` : 'Closed today' };
  };

  /* ---------- results ---------- */
  const matchesWhen = (hours) => {
    if (state.mode !== 'vc' || !state.when) return firstOpenIndex(hours) >= 0;
    if (state.when === 'eday') return isOpen(hours[lastIndex()]);
    if (state.day !== null) return isOpen(hours[state.day]);
    return hours.slice(0, lastIndex()).some(isOpen);
  };
  const pickedDay = () => (state.mode === 'vc' && state.when === 'eday' ? lastIndex() : state.mode === 'vc' && state.when === 'early' ? state.day : null);
  const statusFor = (hours) => {
    const day = pickedDay();
    if (day === null) return todayStatus(hours);
    return { cls: isOpen(hours[day]) ? 'is-open' : 'is-closed', text: `${formatDate(state.data.dates[day])}: ${describeHours(hours[day])}` };
  };
  const countOpenOn = (dayIdx) => state.data.sites.filter((site) => { const h = hoursFor(site, 'vc'); return h && isOpen(h[dayIdx]); }).length;
  const visibleSites = () => {
    const q = state.filter.trim().toLowerCase();
    const list = state.data.sites
      .map((site) => ({ site, hours: hoursFor(site, state.mode) }))
      .filter((r) => r.hours && matchesWhen(r.hours))
      .filter((r) => !q || `${r.site.name} ${r.site.city} ${r.site.zip}`.toLowerCase().includes(q))
      .map((r) => ({ ...r, tier: tierOf(r.hours), miles: state.voter ? haversineMiles(state.voter, r.site) : null }));
    const sorted = state.voter ? list.sort((a, b) => a.miles - b.miles) : list.sort((a, b) => a.site.name.localeCompare(b.site.name));
    const idx = sorted.findIndex((r) => r.site.id === state.selectedId);
    return idx > 0 ? [sorted[idx], ...sorted.slice(0, idx), ...sorted.slice(idx + 1)] : sorted;
  };

  /* ---------- rendering ---------- */
  const renderStrip = (hours, tier) => {
    const { dates } = state.data;
    const cells = hours.map((h, i) => {
      const dt = parseDate(dates[i]);
      const cls = [isOpen(h) ? 'on' : '', isLate(h) ? 'late' : '', i > 0 && dt.getUTCDay() === 0 ? 'wk' : '', i === dates.length - 1 ? 'eday' : '', i === pickedDay() ? 'pick' : ''].filter(Boolean).join(' ');
      return el('i', { class: cls, title: `${formatDate(dates[i])}: ${describeHours(h)}` });
    });
    const openDays = hours.filter(isOpen).length;
    return el('span', { class: 'vf-strip', style: `--tier:${TIERS[tier].color}`, role: 'img', 'aria-label': `Open ${openDays} of ${dates.length} days` }, cells);
  };

  const renderSchedule = (hours) => {
    const { dates } = state.data; const today = phoenixNow().mdy;
    const rows = dates
      .map((d, i) => ({ d, entry: hours[i] }))
      .filter((r) => isOpen(r.entry))
      .map((r) => el('tr', { class: [isLate(r.entry) ? 'late' : '', r.d === today ? 'today' : ''].filter(Boolean).join(' ') },
        el('td', { text: formatDate(r.d) }), el('td', { text: describeHours(r.entry) })));
    const caption = rows.length === 1 ? 'Open one day only' : `Open ${rows.length} days. Closed on days not listed.`;
    return el('table', { class: 'vf-sched' }, el('caption', { text: caption }), el('thead', {}, el('tr', {}, el('th', { text: 'Date' }), el('th', { text: 'Hours' }))), el('tbody', {}, rows));
  };

  const renderEmailForm = (site) => {
    const input = el('input', { type: 'email', required: '', placeholder: 'you@example.com', autocomplete: 'email', 'aria-label': 'Your email address' });
    const button = el('button', { type: 'submit', class: 'vf-btn', text: 'Send' });
    const status = el('p', { class: 'vf-status', role: 'status' });
    const note = state.voter && state.voter.ld
      ? `Includes the statewide guide, the Legislative District ${state.voter.ld} guide, and your local guide.`
      : 'Search your address above first and we will include your Legislative District guide too.';
    const form = el('form', { class: 'vf-email', novalidate: '' },
      el('label', { text: 'Email me this site’s hours and my voter guides' }),
      el('div', { class: 'vf-search-row' }, input, button),
      el('p', { class: 'vf-email-note', text: note }),
      el('p', { class: 'vf-privacy', text: 'We do not save or share this information with any person, campaign, or organization.' }), status);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { status.className = 'vf-status is-error'; status.textContent = 'Enter a valid email address.'; input.focus(); return; }
      button.disabled = true; status.className = 'vf-status'; status.textContent = 'Sending…';
      try {
        const res = await fetch('/api/email', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, siteId: site.id, mode: state.mode, ld: state.voter?.ld || null, city: state.voter?.city || null }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) throw new Error(body.error || 'Could not send the email.');
        status.className = 'vf-status is-ok'; status.textContent = `Sent to ${body.sentTo}. Check your inbox.`; input.value = '';
      } catch (err) {
        status.className = 'vf-status is-error'; status.textContent = err.message;
      } finally { button.disabled = false; }
    });
    return form;
  };

  const renderDetail = (site, hours) => {
    const address = `${site.street}, ${site.city}, AZ ${site.zip}`;
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    return el('div', { class: 'vf-site-body' },
      el('div', { class: 'vf-detail-actions' },
        el('a', { href: directions, target: '_blank', rel: 'noopener', text: 'Get directions' }),
        site.nonElectioneering ? el('span', { class: 'vf-approx', text: 'Non-electioneering site: no campaigning allowed nearby' }) : null,
        site.approx ? el('span', { class: 'vf-approx', text: 'Map pin is approximate' }) : null),
      renderSchedule(hours),
      el('p', { class: 'vf-sched-note', text: 'Bold hours run past 5pm. Hours can change; confirm at Locations.Maricopa.Vote.' }),
      renderEmailForm(site));
  };

  const renderSiteItem = ({ site, hours, tier, miles }) => {
    const selected = site.id === state.selectedId; const status = statusFor(hours);
    const head = el('button', { type: 'button', class: 'vf-site-head', 'aria-expanded': String(selected), onclick: () => selectSite(selected ? null : site.id) },
      el('span', { class: 'vf-site-name', text: site.name }),
      miles !== null ? el('span', { class: 'vf-dist', text: miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi` }) : null,
      el('span', { class: 'vf-site-addr', text: `${site.street}, ${site.city}` }),
      el('span', { class: `vf-today ${status.cls}`, text: status.text }),
      renderStrip(hours, tier));
    return el('li', { class: `vf-site${selected ? ' is-selected' : ''}`, style: `--tier:${TIERS[tier].color}`, 'data-id': site.id }, head, selected ? renderDetail(site, hours) : null);
  };

  const renderList = () => {
    const results = visibleSites(); const list = $('vf-list'); list.replaceChildren();
    const day = pickedDay();
    const scope = day !== null ? `Open ${formatDate(state.data.dates[day])}` : state.voter ? 'Closest to you' : 'All sites';
    $('vf-list-title').textContent = `${scope} (${results.length})`;
    if (!results.length) {
      const msg = day !== null && !state.filter.trim() ? `No vote centers are open ${formatDate(state.data.dates[day])}. Pick another day above.` : 'No sites match that filter.';
      list.append(el('li', { class: 'vf-empty', text: msg })); $('vf-more').hidden = true; renderMarkers([]); return;
    }
    results.slice(0, state.shown).forEach((r) => list.append(renderSiteItem(r)));
    $('vf-more').hidden = results.length <= state.shown;
    renderMarkers(results);
  };

  const renderLegend = () => {
    const present = new Set(visibleSites().map((r) => r.tier));
    const order = ['early', 'oct23', 'oct31', 'eve', 'eday', 'always'];
    $('vf-legend').replaceChildren(...order.filter((t) => present.has(t)).map((t) => el('span', { style: `--swatch:${TIERS[t].color}`, text: TIERS[t].label })),
      el('span', { style: '--swatch:var(--ink)', text: 'Open past 5pm' }));
  };

  const renderGuides = () => {
    const g = state.config.guides; const ul = $('vf-guides'); ul.replaceChildren();
    const items = [g.statewide];
    if (state.voter?.ld) items.push({ label: g.ldPattern.label.replace('{ld}', state.voter.ld), url: g.ldPattern.url.replace('{ld}', state.voter.ld) });
    else items.push({ label: 'Legislative District guides', url: g.ldPattern.url.replace('-{ld}', '') });
    const cityKey = (state.voter?.city || '').toLowerCase();
    items.push(g.local[cityKey] || g.localFallback);
    items.forEach((i) => ul.append(el('li', {}, el('a', { href: i.url, text: i.label }))));
  };

  /* ---------- map ---------- */
  const ensureMap = () => {
    if (map || typeof L === 'undefined') return;
    map = L.map('vf-map', { scrollWheelZoom: false }).setView(MARICOPA_CENTER, 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
  };
  const markerStyle = (tier, selected) => ({ radius: selected ? 11 : 7, color: selected ? '#14213d' : '#fff', weight: selected ? 3 : 1.5, fillColor: TIER_HEX[tier], fillOpacity: 0.95 });
  const renderMarkers = (results) => {
    ensureMap(); if (!map) return;
    markers.forEach((m) => m.remove()); markers = new Map();
    results.forEach(({ site, hours, tier }) => {
      const m = L.circleMarker([site.lat, site.lng], markerStyle(tier, site.id === state.selectedId)).addTo(map);
      m.bindPopup(() => {
        const btn = el('button', { type: 'button', text: 'Show hours' }); btn.addEventListener('click', () => selectSite(site.id, { scroll: true }));
        return el('div', { class: 'vf-popup' }, el('strong', { text: site.name }), el('span', { text: `${site.street}, ${site.city}` }), el('br'), el('span', { text: statusFor(hours).text }), el('br'), btn);
      });
      markers.set(site.id, m);
    });
    if (state.voter) {
      if (youMarker) youMarker.remove();
      youMarker = L.marker([state.voter.lat, state.voter.lng], { icon: L.divIcon({ className: 'vf-you', iconSize: [18, 18] }), title: 'Your location', zIndexOffset: 1000 }).addTo(map);
      const near = results.slice(0, 5).map((r) => [r.site.lat, r.site.lng]);
      map.fitBounds(L.latLngBounds([[state.voter.lat, state.voter.lng], ...near]).pad(0.25), { maxZoom: 13 });
    } else if (!state.selectedId && results.length) {
      map.fitBounds(L.latLngBounds(results.map((r) => [r.site.lat, r.site.lng])).pad(0.05));
    }
  };

  /* ---------- actions ---------- */
  const selectSite = (id, { scroll = false } = {}) => {
    state.selectedId = id; renderList();
    $('vf-scroll').scrollTop = 0;
    if (id === null) return;
    const site = state.sitesById.get(id);
    if (map && site) { map.flyTo([site.lat, site.lng], Math.max(map.getZoom(), 13), { duration: 0.6 }); markers.get(id)?.bringToFront(); }
    const item = document.querySelector(`.vf-site[data-id="${id}"]`);
    if (item && scroll) item.scrollIntoView({ behavior: 'smooth', block: 'start' });
    item?.querySelector('.vf-site-head')?.focus({ preventScroll: !scroll });
  };

  const updateHash = () => {
    if (!history.replaceState) return;
    const parts = [MODE_HASH[state.mode]];
    if (state.mode === 'vc' && state.when) parts.push(WHEN_HASH[state.when]);
    if (state.mode === 'vc' && state.when === 'early' && state.day !== null) parts.push(state.data.dates[state.day].replace(/\//g, '-'));
    history.replaceState(null, '', `#${parts.join('/')}`);
  };
  const showFinder = () => {
    state.selectedId = null; state.shown = PAGE_SIZE;
    $('vf-finder').hidden = false;
    updateHash(); renderLegend(); renderList();
    requestAnimationFrame(() => { map?.invalidateSize(); if (!state.voter) map?.fitBounds(L.latLngBounds(visibleSites().map((r) => [r.site.lat, r.site.lng])).pad(0.05)); });
    if (!state.voter) $('vf-query').focus({ preventScroll: true });
    $('vf-finder').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const renderCalendar = () => {
    const { dates } = state.data; const cal = $('vf-cal'); cal.replaceChildren();
    const any = el('button', { type: 'button', class: 'vf-cal-any', 'aria-pressed': String(state.day === null), onclick: () => setDay(null) }, el('b', { text: 'Any day' }), el('small', { text: 'show every early voting site' }));
    cal.append(any);
    DAY_NAMES.forEach((d) => cal.append(el('div', { class: 'vf-cal-dow', text: d })));
    const firstDow = parseDate(dates[0]).getUTCDay();
    for (let i = 0; i < firstDow; i += 1) cal.append(el('div'));
    dates.slice(0, lastIndex()).forEach((d, i) => {
      const dt = parseDate(d); const dow = dt.getUTCDay(); const open = countOpenOn(i);
      const showMonth = i === 0 || dt.getUTCDate() === 1;
      cal.append(el('button', { type: 'button', class: dow === 0 || dow === 6 ? 'is-weekend' : '', 'aria-pressed': String(state.day === i), 'aria-label': `${formatDate(d)}, ${open} sites open`, title: `${open} sites open`, onclick: () => setDay(i) },
        el('b', { text: String(dt.getUTCDate()) }), el('small', { text: showMonth ? MONTH_NAMES[dt.getUTCMonth()] : `${open}` })));
    });
  };
  const setDay = (day) => {
    state.day = day; state.dayChosen = true;
    renderCalendar();
    setAnswer('day', day === null ? 'Any early voting day' : formatDate(state.data.dates[day]));
    showFinder();
  };
  const setWhen = (when) => {
    state.when = when;
    document.querySelectorAll('.vf-tile[data-when]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.when === when)));
    setAnswer('when', when === 'eday' ? `${WHEN_LABELS.eday} (${shortDate(state.data.dates[lastIndex()])})` : WHEN_LABELS.early);
    $('vf-daypick').hidden = when !== 'early';
    if (when === 'early') {
      renderCalendar();
      setAnswer('day', state.dayChosen ? (state.day === null ? 'Any early voting day' : formatDate(state.data.dates[state.day])) : null);
      if (!state.dayChosen) {
        $('vf-finder').hidden = true; updateHash();
        $('vf-daypick').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    showFinder();
  };
  const applyWhenCopy = () => {
    const { dates } = state.data; const last = lastIndex();
    $('vf-early-sub').textContent = `${formatDate(dates[0])} through ${formatDate(dates[last - 1])}`;
    $('vf-eday-title').textContent = `Election Day (${shortDate(dates[last])})`;
    $('vf-when-blurb').textContent = `Arizona offers in-person early voting. In Maricopa County it runs ${formatDate(dates[0])} through ${formatDate(dates[last - 1])}, and every vote center is open on Election Day, ${formatDate(dates[last])}. Not every location is open every day, and hours vary by site.`;
  };
  const setMode = (mode) => {
    state.mode = mode;
    document.querySelectorAll('.vf-tile[data-mode]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.mode === mode)));
    setAnswer('mode', MODE_LABELS[mode]);
    if (mode === 'vc') {
      $('vf-when').hidden = false;
      if (state.when) { setWhen(state.when); return; }
      $('vf-finder').hidden = true; updateHash();
      $('vf-when').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    $('vf-when').hidden = true;
    showFinder();
  };

  const setStatus = (text, cls = '') => { const s = $('vf-status'); s.textContent = text; s.className = `vf-status ${cls}`.trim(); };
  const setVoter = (voter) => {
    state.voter = voter; state.selectedId = null; state.shown = PAGE_SIZE;
    const where = voter.label ? `Showing sites closest to ${voter.label}.` : 'Showing sites closest to you.';
    const extra = voter.ld ? ` You are in Legislative District ${voter.ld}.` : '';
    setStatus(where + extra, 'is-ok');
    renderGuides(); renderLegend(); renderList();
  };

  const lookupZip = async (zip) => {
    const zips = await fetch('/data/zips.json').then((r) => r.json());
    const hit = zips[zip];
    if (!hit) throw new Error('That ZIP code is not in Arizona.');
    const [lat, lng, place] = hit;
    const geo = await fetch(`/api/locate?lat=${lat}&lng=${lng}`).then((r) => r.json()).catch(() => ({}));
    return { lat, lng, label: `ZIP ${zip} (${place})`, ld: geo.ld || null, city: geo.city || place };
  };
  const lookupAddress = async (q) => {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`); const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) throw new Error(body.error || 'Address lookup failed.');
    return { lat: body.lat, lng: body.lng, label: body.label, ld: body.ld, city: body.city };
  };

  const onSearch = async (e) => {
    e.preventDefault();
    const q = $('vf-query').value.trim(); if (!q) { setStatus('Enter an address or ZIP code.', 'is-error'); return; }
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; setStatus('Looking that up…');
    try { setVoter(await (/^\d{5}$/.test(q) ? lookupZip(q) : lookupAddress(q))); }
    catch (err) { setStatus(err.message, 'is-error'); }
    finally { btn.disabled = false; }
  };
  const onGeolocate = () => {
    if (!navigator.geolocation) { setStatus('Your browser does not support location lookup.', 'is-error'); return; }
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const geo = await fetch(`/api/locate?lat=${lat}&lng=${lng}`).then((r) => r.json()).catch(() => ({}));
      setVoter({ lat, lng, label: '', ld: geo.ld || null, city: geo.city || null });
    }, () => setStatus('We could not get your location. Enter an address or ZIP instead.', 'is-error'), { timeout: 10000, maximumAge: 60000 });
  };

  /* ---------- boot ---------- */
  const applyConfig = () => {
    const c = state.config; if (!c) return;
    $('vf-title').textContent = c.copy.title; document.title = `${c.copy.title} | ${c.election.county}`;
    $('vf-intro').textContent = c.copy.intro; $('vf-question').textContent = c.copy.question;
    $('vf-election').textContent = `${c.election.name}, ${c.election.county}`;
    renderGuides();
  };
  const init = async () => {
    const [data, config] = await Promise.all([
      fetch('/data/sites.json').then((r) => r.json()),
      fetch('/api/config').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    state.data = data; state.config = config; data.sites.forEach((s) => state.sitesById.set(s.id, s));
    applyConfig();
    document.querySelectorAll('.vf-tile[data-mode]').forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
    $('vf-search').addEventListener('submit', onSearch);
    $('vf-geo').addEventListener('click', onGeolocate);
    $('vf-filter').addEventListener('input', (e) => { state.filter = e.target.value; state.shown = PAGE_SIZE; renderList(); });
    $('vf-more').addEventListener('click', () => { state.shown += PAGE_SIZE; renderList(); });
    applyWhenCopy();
    document.querySelectorAll('.vf-tile[data-when]').forEach((t) => t.addEventListener('click', () => setWhen(t.dataset.when)));
    document.querySelectorAll('.vf-change').forEach((b) => b.addEventListener('click', () => {
      setAnswer(b.dataset.change, null);
      const focusTarget = $(`vf-${b.dataset.change}-body`).querySelector('button');
      focusTarget?.focus({ preventScroll: true });
    }));
    const [modeHash, whenHash, dayHash] = location.hash.replace(/^#/, '').split('/');
    const initialMode = Object.entries(MODE_HASH).find(([, h]) => h === modeHash)?.[0];
    const initialWhen = Object.entries(WHEN_HASH).find(([, h]) => h === whenHash)?.[0];
    if (initialMode === 'vc' && initialWhen) {
      state.when = initialWhen;
      const dayIdx = dayHash ? data.dates.indexOf(dayHash.replace(/-/g, '/')) : -1;
      state.day = initialWhen === 'early' && dayIdx >= 0 ? dayIdx : null;
      state.dayChosen = dayIdx >= 0;
    }
    if (initialMode) setMode(initialMode);
  };
  init().catch((err) => { console.error(err); $('vf-intro').textContent = 'We could not load the site list. Refresh the page to try again.'; });
})();
