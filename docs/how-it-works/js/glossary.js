// glossary.js — Term tooltip engine for How the Sausage Gets Made
// Loads terms.json and creates interactive tooltips for legislative terms.
// No dependencies. Works in any modern browser.

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────
  var terms = [];       // Array of { term, abbr?, definition, category? }
  var tooltipEl = null; // Singleton tooltip DOM node
  var activeTermEl = null; // Currently highlighted term (mobile tap)
  var isTouchDevice = false;

  // ── Constants ──────────────────────────────────────────────────────────
  var SKIP_TAGS = [
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
    'CODE', 'PRE', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'
  ];
  var TOOLTIP_GAP = 8;   // px between term and tooltip
  var FADE_DURATION = 150; // ms

  // ── Load terms data ────────────────────────────────────────────────────
  function loadTerms() {
    // Base path can be overridden via <meta name="glossary-base" content="..">
    var base = '';
    var meta = document.querySelector('meta[name="glossary-base"]');
    if (meta && meta.content) {
      base = meta.content.replace(/\/+$/, '');
    } else {
      base = '.';
    }

    var url = base + '/data/terms.json';

    fetch(url)
      .then(function (resp) {
        if (!resp.ok) throw new Error('Failed to load terms.json: ' + resp.status);
        return resp.json();
      })
      .then(function (data) {
        terms = data;
        scanAndMark();
      })
      .catch(function (err) {
        console.warn('[glossary] ' + err.message);
      });
  }

  // ── Build regex patterns ───────────────────────────────────────────────
  // Returns an array of { pattern: RegExp, term: Object } sorted longest-first
  // so "Committee of the Whole" matches before "Committee".
  function buildPatterns() {
    // Collect all matchable strings per term (full name + abbreviation)
    var entries = [];

    terms.forEach(function (t) {
      // Full term name
      entries.push({ text: t.term, termObj: t });
      // Abbreviation (e.g. "COW")
      if (t.abbr) {
        entries.push({ text: t.abbr, termObj: t });
      }
    });

    // Sort longest first to avoid partial matches
    entries.sort(function (a, b) {
      return b.text.length - a.text.length;
    });

    return entries.map(function (e) {
      // Escape regex special chars, then wrap in word boundaries
      var escaped = e.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        pattern: new RegExp('\\b(' + escaped + ')\\b', 'i'),
        termObj: e.termObj
      };
    });
  }

  // ── Scan and mark terms in the DOM ─────────────────────────────────────
  function scanAndMark() {
    if (!terms.length) return;

    var patterns = buildPatterns();

    // Only scan within .guide-content containers (or body as fallback)
    var containers = document.querySelectorAll('.guide-content');
    if (!containers.length) {
      containers = [document.body];
    }

    for (var c = 0; c < containers.length; c++) {
      walkAndMark(containers[c], patterns);
    }
  }

  // Walk the DOM tree, processing only text nodes
  function walkAndMark(root, patterns) {
    // TreeWalker gives us only text nodes efficiently
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // Skip if parent is a tag we should ignore
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.indexOf(parent.tagName) !== -1) return NodeFilter.FILTER_REJECT;
        // Skip if already inside a term-highlight
        if (parent.closest('.term-highlight')) return NodeFilter.FILTER_REJECT;
        // Skip empty/whitespace-only nodes
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    // Collect text nodes first (modifying DOM during walk is unsafe)
    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    // Track which terms we've already marked (first occurrence per section only)
    var markedTerms = {};

    textNodes.forEach(function (textNode) {
      processTextNode(textNode, patterns, markedTerms);
    });
  }

  // Process a single text node: find the first unmarked term and wrap it
  function processTextNode(textNode, patterns, markedTerms) {
    var text = textNode.textContent;

    for (var i = 0; i < patterns.length; i++) {
      var entry = patterns[i];
      var termKey = entry.termObj.term.toLowerCase();

      // Only mark first occurrence of each term in the document
      if (markedTerms[termKey]) continue;

      var match = entry.pattern.exec(text);
      if (!match) continue;

      // Found a match — split the text node and wrap the match
      var matchStart = match.index;
      var matchEnd = matchStart + match[0].length;

      // Create the wrapper span
      var span = document.createElement('span');
      span.className = 'term-highlight';
      span.setAttribute('data-term', entry.termObj.term);
      span.setAttribute('tabindex', '0');
      span.setAttribute('role', 'button');
      span.setAttribute('aria-label', 'Definition: ' + entry.termObj.term);
      span.textContent = match[0]; // preserve original casing

      // Split: [before][span][after]
      var parent = textNode.parentNode;
      var afterNode = textNode.splitText(matchStart);
      afterNode.textContent = afterNode.textContent.substring(match[0].length);
      parent.insertBefore(span, afterNode);

      markedTerms[termKey] = true;

      // Don't process the remainder of this text node for this term,
      // but the afterNode might contain other terms (handled in later iterations
      // of the textNodes loop since we collected nodes upfront).
      break; // one match per text node pass
    }
  }

  // ── Tooltip creation and positioning ───────────────────────────────────
  function createTooltip() {
    if (tooltipEl) return tooltipEl;

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'glossary-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.style.cssText = [
      'position:fixed',
      'z-index:10000',
      'max-width:320px',
      'padding:12px 16px',
      'background:#1a1a2e',
      'color:#e0e0e0',
      'border-radius:8px',
      'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
      'font-size:14px',
      'line-height:1.5',
      'opacity:0',
      'pointer-events:none',
      'transition:opacity ' + FADE_DURATION + 'ms ease',
      'border:1px solid rgba(255,255,255,0.1)'
    ].join(';');

    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function showTooltip(termEl) {
    var termName = termEl.getAttribute('data-term');
    var termObj = findTermByName(termName);
    if (!termObj) return;

    var tip = createTooltip();

    // Build tooltip content
    var html = '';

    // Category badge
    if (termObj.category) {
      html += '<span style="display:inline-block;padding:2px 8px;' +
        'background:rgba(99,102,241,0.2);color:#818cf8;border-radius:4px;' +
        'font-size:11px;font-weight:600;text-transform:uppercase;' +
        'letter-spacing:0.5px;margin-bottom:6px">' +
        escapeHtml(termObj.category) + '</span>';
    }

    // Term name
    html += '<div style="font-weight:700;font-size:15px;margin-bottom:4px;color:#fff">' +
      escapeHtml(termObj.term);
    if (termObj.abbr) {
      html += ' <span style="color:#818cf8;font-weight:400">(' + escapeHtml(termObj.abbr) + ')</span>';
    }
    html += '</div>';

    // Definition
    html += '<div style="color:#c0c0d0">' + escapeHtml(termObj.definition) + '</div>';

    // Glossary link
    var base = '';
    var meta = document.querySelector('meta[name="glossary-base"]');
    if (meta && meta.content) {
      base = meta.content.replace(/\/+$/, '');
    }
    html += '<a href="' + base + '/glossary.html#' + slugify(termObj.term) + '" ' +
      'style="display:inline-block;margin-top:8px;color:#818cf8;font-size:12px;' +
      'text-decoration:none;font-weight:600">' +
      'See full glossary &rarr;</a>';

    tip.innerHTML = html;

    // Allow clicks on the glossary link
    tip.style.pointerEvents = 'auto';

    // Position the tooltip
    positionTooltip(termEl);

    // Fade in
    requestAnimationFrame(function () {
      tip.style.opacity = '1';
    });

    activeTermEl = termEl;
    termEl.classList.add('term-active');
  }

  function positionTooltip(termEl) {
    var tip = tooltipEl;
    if (!tip) return;

    var termRect = termEl.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var viewW = window.innerWidth;
    var viewH = window.innerHeight;

    // Make visible off-screen briefly to measure
    tip.style.visibility = 'hidden';
    tip.style.opacity = '0';
    tip.style.display = 'block';

    // Force layout to get accurate measurements
    var tipW = tip.offsetWidth;
    var tipH = tip.offsetHeight;

    tip.style.visibility = '';

    // Horizontal: center on term, clamp to viewport
    var left = termRect.left + (termRect.width / 2) - (tipW / 2);
    left = Math.max(8, Math.min(left, viewW - tipW - 8));

    // Vertical: prefer above, fall back to below
    var top;
    if (termRect.top - tipH - TOOLTIP_GAP > 8) {
      // Above
      top = termRect.top - tipH - TOOLTIP_GAP;
    } else {
      // Below
      top = termRect.bottom + TOOLTIP_GAP;
    }

    // Clamp vertical
    top = Math.max(8, Math.min(top, viewH - tipH - 8));

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function hideTooltip() {
    if (!tooltipEl) return;

    tooltipEl.style.opacity = '0';
    tooltipEl.style.pointerEvents = 'none';

    if (activeTermEl) {
      activeTermEl.classList.remove('term-active');
      activeTermEl = null;
    }
  }

  // ── Lookup helper ──────────────────────────────────────────────────────
  function findTermByName(name) {
    var lower = name.toLowerCase();
    for (var i = 0; i < terms.length; i++) {
      if (terms[i].term.toLowerCase() === lower) return terms[i];
    }
    return null;
  }

  // ── Utility ────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function slugify(str) {
    return str.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ── Event binding ──────────────────────────────────────────────────────
  function bindEvents() {
    // Detect touch device
    window.addEventListener('touchstart', function onFirstTouch() {
      isTouchDevice = true;
      window.removeEventListener('touchstart', onFirstTouch);
    }, { passive: true });

    // Use event delegation on document for efficiency
    document.addEventListener('mouseenter', function (e) {
      if (isTouchDevice) return;
      if (!e.target || !e.target.closest) return;
      var termEl = e.target.closest('.term-highlight');
      if (termEl) showTooltip(termEl);
    }, true); // useCapture for mouseenter delegation

    document.addEventListener('mouseleave', function (e) {
      if (isTouchDevice) return;
      if (!e.target || !e.target.closest) return;
      var termEl = e.target.closest('.term-highlight');
      if (!termEl) return;

      // Small delay to allow moving to tooltip
      setTimeout(function () {
        if (tooltipEl && tooltipEl.matches(':hover')) return;
        hideTooltip();
      }, 100);
    }, true);

    // Hide when leaving the tooltip itself
    document.addEventListener('mouseleave', function (e) {
      if (e.target === tooltipEl) {
        hideTooltip();
      }
    }, true);

    // Mobile: tap to toggle
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var termEl = e.target.closest('.term-highlight');

      // Clicking inside tooltip (e.g. the link) — let it through
      if (tooltipEl && tooltipEl.contains(e.target)) return;

      if (termEl) {
        e.preventDefault();
        if (activeTermEl === termEl) {
          hideTooltip();
        } else {
          hideTooltip();
          showTooltip(termEl);
        }
        return;
      }

      // Click outside — dismiss
      if (activeTermEl) {
        hideTooltip();
      }
    });

    // Keyboard: Escape to dismiss, Enter/Space to toggle on focused term
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        hideTooltip();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        var termEl = document.activeElement;
        if (termEl && termEl.classList.contains('term-highlight')) {
          e.preventDefault();
          if (activeTermEl === termEl) {
            hideTooltip();
          } else {
            hideTooltip();
            showTooltip(termEl);
          }
        }
      }
    });

    // Reposition on scroll/resize
    var repositionTimer = null;
    function handleReposition() {
      if (repositionTimer) return;
      repositionTimer = requestAnimationFrame(function () {
        repositionTimer = null;
        if (activeTermEl && tooltipEl) {
          positionTooltip(activeTermEl);
        }
      });
    }

    window.addEventListener('scroll', handleReposition, { passive: true });
    window.addEventListener('resize', handleReposition, { passive: true });
  }

  // ── Initialize ─────────────────────────────────────────────────────────
  function init() {
    bindEvents();
    loadTerms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
