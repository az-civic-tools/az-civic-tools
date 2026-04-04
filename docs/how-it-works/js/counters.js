// counters.js — Animated counter component for How the Sausage Gets Made
// Animates numbers from 0 to a target value when they scroll into view.
// No dependencies. Works in any modern browser.

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────────
  var DURATION = 1500;  // ms for the full animation
  var SELECTOR = '.counter-value';

  // ── Easing function ────────────────────────────────────────────────────
  // easeOutCubic: fast start, smooth deceleration
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ── Format a number with optional decimals and suffix ──────────────────
  function formatValue(value, decimals, suffix) {
    var formatted;

    if (decimals > 0) {
      formatted = value.toFixed(decimals);
    } else {
      formatted = Math.round(value).toLocaleString();
    }

    return formatted + (suffix || '');
  }

  // ── Animate a single counter element ───────────────────────────────────
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    if (isNaN(target)) return;

    var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';

    // Respect prefers-reduced-motion: show final value immediately
    if (prefersReducedMotion()) {
      el.textContent = formatValue(target, decimals, suffix);
      el.classList.add('counter-done');
      return;
    }

    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / DURATION, 1);
      var easedProgress = easeOutCubic(progress);
      var currentValue = easedProgress * target;

      el.textContent = formatValue(currentValue, decimals, suffix);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Ensure we land exactly on the target
        el.textContent = formatValue(target, decimals, suffix);
        el.classList.add('counter-done');
      }
    }

    // Set initial value
    el.textContent = formatValue(0, decimals, suffix);
    requestAnimationFrame(step);
  }

  // ── Reduced motion check ───────────────────────────────────────────────
  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Set up IntersectionObserver ────────────────────────────────────────
  function initObserver() {
    var counters = document.querySelectorAll(SELECTOR);
    if (!counters.length) return;

    // If IntersectionObserver isn't supported, animate all immediately
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < counters.length; i++) {
        animateCounter(counters[i]);
      }
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;

        // Don't re-animate
        if (el.classList.contains('counter-done') || el.classList.contains('counter-animating')) {
          return;
        }

        el.classList.add('counter-animating');
        animateCounter(el);

        // Stop observing this element
        observer.unobserve(el);
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.2 // Trigger when 20% visible
    });

    for (var j = 0; j < counters.length; j++) {
      // Set initial display to 0 (or final value if reduced motion)
      var el = counters[j];
      var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';

      if (prefersReducedMotion()) {
        var target = parseFloat(el.getAttribute('data-target'));
        if (!isNaN(target)) {
          el.textContent = formatValue(target, decimals, suffix);
          el.classList.add('counter-done');
        }
      } else {
        el.textContent = formatValue(0, decimals, suffix);
        observer.observe(el);
      }
    }
  }

  // ── Initialize ─────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
