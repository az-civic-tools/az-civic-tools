// toc.js — Scroll-tracking table of contents for How the Sausage Gets Made
// Highlights the current section in a sidebar TOC using IntersectionObserver.
// No dependencies. Works in any modern browser.

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────────
  var ACTIVE_CLASS = 'active';
  var TOC_SELECTOR = '.toc a[href^="#"]'; // TOC links that point to anchors
  var SCROLL_OFFSET = 80; // px from top to account for sticky headers

  // ── State ──────────────────────────────────────────────────────────────
  var tocLinks = [];
  var sectionMap = {}; // id -> { link, el }
  var observer = null;
  var visibleSections = new Set();
  var isScrolling = false;

  // ── Gather TOC links and their target sections ─────────────────────────
  function gatherSections() {
    var links = document.querySelectorAll(TOC_SELECTOR);
    if (!links.length) return false;

    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var hash = link.getAttribute('href');
      if (!hash || hash === '#') continue;

      var id = hash.substring(1);
      var targetEl = document.getElementById(id);
      if (!targetEl) continue;

      tocLinks.push({ link: link, el: targetEl, id: id });
      sectionMap[id] = { link: link, el: targetEl };
    }

    return tocLinks.length > 0;
  }

  // ── IntersectionObserver callback ──────────────────────────────────────
  // Tracks which sections are currently in the viewport.
  // The "active" section is the topmost visible one.
  function onIntersect(entries) {
    entries.forEach(function (entry) {
      var id = entry.target.id;
      if (entry.isIntersecting) {
        visibleSections.add(id);
      } else {
        visibleSections.delete(id);
      }
    });

    if (isScrolling) return; // Don't update during programmatic scroll
    updateActiveLink();
  }

  // ── Determine which TOC link should be active ──────────────────────────
  function updateActiveLink() {
    // Remove all active classes
    tocLinks.forEach(function (item) {
      item.link.classList.remove(ACTIVE_CLASS);
    });

    // If nothing is visible, activate the section nearest the top
    if (visibleSections.size === 0) {
      activateNearestAbove();
      return;
    }

    // Find the topmost visible section (in document order)
    for (var i = 0; i < tocLinks.length; i++) {
      if (visibleSections.has(tocLinks[i].id)) {
        tocLinks[i].link.classList.add(ACTIVE_CLASS);
        scrollTocLinkIntoView(tocLinks[i].link);
        return;
      }
    }
  }

  // When scrolled past all observed sections, highlight the last one
  // above the current scroll position.
  function activateNearestAbove() {
    var scrollY = window.scrollY || window.pageYOffset;
    var best = null;

    for (var i = 0; i < tocLinks.length; i++) {
      var rect = tocLinks[i].el.getBoundingClientRect();
      var elTop = rect.top + scrollY;
      if (elTop <= scrollY + SCROLL_OFFSET + 10) {
        best = tocLinks[i];
      }
    }

    // Edge case: at the very top of the page, highlight first section
    if (!best && tocLinks.length > 0 && scrollY < 100) {
      best = tocLinks[0];
    }

    // Edge case: at the very bottom, highlight last section
    if (!best && tocLinks.length > 0) {
      var atBottom = (window.innerHeight + scrollY) >= (document.body.scrollHeight - 50);
      if (atBottom) {
        best = tocLinks[tocLinks.length - 1];
      }
    }

    if (best) {
      best.link.classList.add(ACTIVE_CLASS);
      scrollTocLinkIntoView(best.link);
    }
  }

  // ── Keep active TOC link visible in scrollable sidebar ─────────────────
  function scrollTocLinkIntoView(link) {
    // Only matters if the TOC container itself is scrollable
    var tocContainer = link.closest('.toc');
    if (!tocContainer) return;

    // Check if the TOC is scrollable
    if (tocContainer.scrollHeight <= tocContainer.clientHeight) return;

    var linkRect = link.getBoundingClientRect();
    var containerRect = tocContainer.getBoundingClientRect();

    // If the link is outside the visible area of the TOC, scroll it in
    if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
      link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ── Smooth scroll on TOC link click ────────────────────────────────────
  function handleTocClick(e) {
    var link = e.target.closest(TOC_SELECTOR);
    if (!link) return;

    var hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    var id = hash.substring(1);
    var targetEl = document.getElementById(id);
    if (!targetEl) return;

    e.preventDefault();

    // Mark as scrolling to prevent observer from fighting with us
    isScrolling = true;

    // Remove all active, set this one
    tocLinks.forEach(function (item) {
      item.link.classList.remove(ACTIVE_CLASS);
    });
    link.classList.add(ACTIVE_CLASS);

    // Smooth scroll to target
    var targetTop = targetEl.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;

    window.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });

    // Update URL hash without jumping
    if (history.pushState) {
      history.pushState(null, '', hash);
    }

    // Re-enable observer updates after scroll finishes
    // Use a generous timeout since smooth scroll duration varies
    setTimeout(function () {
      isScrolling = false;
      updateActiveLink();
    }, 800);
  }

  // ── Set up IntersectionObserver ────────────────────────────────────────
  function createObserver() {
    // rootMargin: trigger a bit before elements enter the viewport top,
    // and consider an element "exited" shortly after it leaves
    var options = {
      root: null, // viewport
      rootMargin: '-' + SCROLL_OFFSET + 'px 0px -35% 0px',
      threshold: 0
    };

    observer = new IntersectionObserver(onIntersect, options);

    tocLinks.forEach(function (item) {
      observer.observe(item.el);
    });
  }

  // ── Bind click handlers ────────────────────────────────────────────────
  function bindEvents() {
    // Delegate from document so dynamically added TOC links still work
    document.addEventListener('click', handleTocClick);

    // Fallback: also listen for scroll to catch edge cases
    // (e.g., user scrolls to bottom where no section header is visible)
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (isScrolling) return;
      if (scrollTimer) cancelAnimationFrame(scrollTimer);
      scrollTimer = requestAnimationFrame(function () {
        // Only update if no sections are visible (edge case handling)
        if (visibleSections.size === 0) {
          updateActiveLink();
        }
      });
    }, { passive: true });
  }

  // ── Initialize ─────────────────────────────────────────────────────────
  function init() {
    if (!gatherSections()) return; // No TOC links found, nothing to do
    createObserver();
    bindEvents();

    // Set initial state
    updateActiveLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
