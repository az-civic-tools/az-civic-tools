/* ============================================================
   Theme Switcher — cactus.watch
   Self-contained: floating button + modal + localStorage
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'cactus-watch-theme';
  var DEFAULT_THEME = 'sonoran';

  var themes = [
    {
      id: 'sonoran',
      name: 'Sonoran Dusk',
      desc: 'Warm terracotta and desert gold, inspired by Arizona sunsets.',
      swatch: 'linear-gradient(135deg, #4A2C17, #C2512B, #C9A84C)'
    },
    {
      id: 'copper',
      name: 'Copper State',
      desc: 'Clean charcoal and copper — mid-century civic architecture.',
      swatch: '#2D2D2D',
      swatchBorder: '2px solid #B87333'
    },
    {
      id: 'prickly',
      name: 'Prickly Pear',
      desc: 'Vivid magenta and plum — blooming prickly pear energy.',
      swatch: '#3B1F2B',
      dot: true
    }
  ];

  // --- Apply saved theme on load ---
  var saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  document.body.setAttribute('data-theme', saved);

  // --- Create floating button ---
  var btn = document.createElement('button');
  btn.className = 'bt-theme-btn';
  btn.setAttribute('aria-label', 'Change theme');
  btn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="5"/>' +
    '<line x1="12" y1="1" x2="12" y2="3"/>' +
    '<line x1="12" y1="21" x2="12" y2="23"/>' +
    '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
    '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
    '<line x1="1" y1="12" x2="3" y2="12"/>' +
    '<line x1="21" y1="12" x2="23" y2="12"/>' +
    '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
    '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' +
    '</svg>' +
    '<span class="bt-theme-btn-label">Change Theme</span>';
  document.body.appendChild(btn);

  // --- Create overlay + modal ---
  var overlay = document.createElement('div');
  overlay.className = 'bt-theme-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Choose a theme');

  var modal = document.createElement('div');
  modal.className = 'bt-theme-modal';

  var heading = document.createElement('h2');
  heading.textContent = 'Choose a Theme';
  modal.appendChild(heading);

  var sub = document.createElement('p');
  sub.className = 'bt-theme-modal-sub';
  sub.textContent = 'Pick the visual style that suits you best.';
  modal.appendChild(sub);

  var optContainer = document.createElement('div');
  optContainer.className = 'bt-theme-options';

  themes.forEach(function (t) {
    var opt = document.createElement('div');
    opt.className = 'bt-theme-opt';
    opt.setAttribute('tabindex', '0');
    opt.setAttribute('role', 'button');
    opt.setAttribute('data-theme-id', t.id);
    if (t.id === saved) opt.classList.add('bt-theme-opt--selected');

    var swatch = document.createElement('div');
    swatch.className = 'bt-theme-swatch';
    swatch.style.background = t.swatch;
    if (t.swatchBorder) swatch.style.border = t.swatchBorder;
    if (t.dot) {
      var dotEl = document.createElement('span');
      dotEl.className = 'bt-theme-swatch-dot';
      swatch.appendChild(dotEl);
    }

    var info = document.createElement('div');
    info.className = 'bt-theme-opt-info';
    var h3 = document.createElement('h3');
    h3.textContent = t.name;
    var p = document.createElement('p');
    p.textContent = t.desc;
    info.appendChild(h3);
    info.appendChild(p);

    opt.appendChild(swatch);
    opt.appendChild(info);
    optContainer.appendChild(opt);

    // Selection handler
    function selectTheme() {
      document.body.setAttribute('data-theme', t.id);
      localStorage.setItem(STORAGE_KEY, t.id);
      var allOpts = optContainer.querySelectorAll('.bt-theme-opt');
      for (var i = 0; i < allOpts.length; i++) {
        allOpts[i].classList.remove('bt-theme-opt--selected');
      }
      opt.classList.add('bt-theme-opt--selected');
      setTimeout(closeModal, 350);
    }

    opt.addEventListener('click', selectTheme);
    opt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTheme();
      }
    });
  });

  modal.appendChild(optContainer);

  var footer = document.createElement('p');
  footer.className = 'bt-theme-modal-footer';
  footer.textContent = 'Theme is saved to your browser.';
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // --- Open / Close ---
  function openModal() {
    overlay.classList.add('bt-theme-overlay--open');
    // Update selected state
    var current = document.body.getAttribute('data-theme') || DEFAULT_THEME;
    var allOpts = optContainer.querySelectorAll('.bt-theme-opt');
    for (var i = 0; i < allOpts.length; i++) {
      var isSelected = allOpts[i].getAttribute('data-theme-id') === current;
      allOpts[i].classList.toggle('bt-theme-opt--selected', isSelected);
      if (isSelected) allOpts[i].focus();
    }
  }

  function closeModal() {
    overlay.classList.remove('bt-theme-overlay--open');
    btn.focus();
  }

  btn.addEventListener('click', openModal);

  // Close on backdrop click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('bt-theme-overlay--open')) {
      closeModal();
    }
  });

  // Scroll-fade: show FABs only when near top or bottom of page
  function updateFabVisibility() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    const threshold = 200; // px from top/bottom to start showing

    const nearEdge = scrollTop < threshold || distFromBottom < threshold;
    const fabs = document.querySelectorAll('.bt-feedback-fab, .bt-theme-btn');
    fabs.forEach(function (fab) {
      fab.classList.toggle('bt-fab-hidden', !nearEdge);
    });
  }

  let scrollTick = false;
  window.addEventListener('scroll', function () {
    if (!scrollTick) {
      requestAnimationFrame(function () {
        updateFabVisibility();
        scrollTick = false;
      });
      scrollTick = true;
    }
  }, { passive: true });

  // Initial check
  updateFabVisibility();
})();
