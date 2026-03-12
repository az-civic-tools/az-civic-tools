/* ============================================================
   AZ District Finder — Interactive Legislative District Map
   https://github.com/az-civic-tools/az-civic-tools

   Usage:
     AZDistrictFinder.init({
       container: '#my-element',      // CSS selector or element
       dataUrl: './data/legislators.json',
       geojsonUrl: './data/az-districts.geojson',
       source: 'My Organization',     // attribution in copy-markdown
       sourceUrl: '',                  // link for attribution
       legislature: '57th Legislature'
     });
   ============================================================ */

var AZDistrictFinder = (function() {
  'use strict';

  var config = {
    container: null,
    dataUrl: './data/legislators.json',
    geojsonUrl: './data/az-districts.geojson',
    source: '',
    sourceUrl: '',
    legislature: '57th Legislature',
    districtListCollapsed: true   // false = always expanded, no toggle
  };

  var PARTY_COLORS = { R: '#c0392b', D: '#2471a3', I: '#7d8c8e' };

  var map;
  var geojsonLayer;
  var selectedDistrict = null;
  var districtGeoJSON = null;
  var legislators = null;
  var containerEl = null;

  /* ---- Init ---- */
  function init(userConfig) {
    if (userConfig) {
      for (var key in userConfig) {
        if (userConfig.hasOwnProperty(key)) {
          config[key] = userConfig[key];
        }
      }
    }

    // Read URL params for overrides
    var params = new URLSearchParams(window.location.search);
    if (params.get('district')) config._initialDistrict = parseInt(params.get('district'), 10);
    if (params.get('source')) config.source = params.get('source');

    // Resolve container
    if (typeof config.container === 'string') {
      containerEl = document.querySelector(config.container);
    } else if (config.container instanceof HTMLElement) {
      containerEl = config.container;
    } else {
      containerEl = document.getElementById('df-root');
    }

    if (!containerEl) {
      console.error('AZDistrictFinder: container not found');
      return;
    }

    // Load data then build UI
    fetch(config.dataUrl)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        legislators = data.districts;
        if (data.meta && data.meta.legislature) {
          config.legislature = data.meta.legislature;
        }
        buildUI();
        initMap();
        buildDistrictList();
        initDistrictToggle();
        initMobileOverlay();
        initAddressSearch();

        if (config._initialDistrict && legislators[config._initialDistrict]) {
          setTimeout(function() {
            selectDistrictByNumber(config._initialDistrict);
          }, 800);
        }
      })
      .catch(function(err) {
        console.error('AZDistrictFinder: failed to load legislator data', err);
        containerEl.innerHTML = '<p style="text-align:center;padding:40px;color:#c00;">Failed to load legislator data. Please try refreshing the page.</p>';
      });
  }

  /* ---- Build DOM ---- */
  function buildUI() {
    var html = '';

    // Header
    html += '<div class="df-header">' +
      '<h1>Find Your Arizona Legislators</h1>' +
      '<p>Enter your address or click on the map to find your state senator and representatives.</p>' +
      '</div>';

    // Address search
    html += '<div class="df-section">' +
      '<div class="df-address-search">' +
        '<form id="df-address-form" class="df-address-form" autocomplete="on">' +
          '<div class="df-address-input-wrap">' +
            '<label for="df-address-input" class="sr-only">Enter your Arizona address</label>' +
            '<input type="text" id="df-address-input" name="address" placeholder="Enter your Arizona address (e.g., 1700 W Washington St, Phoenix AZ)" autocomplete="street-address" required>' +
            '<button type="submit" class="df-address-btn">Find My District</button>' +
          '</div>' +
          '<div id="df-address-error" class="df-address-error" role="alert"></div>' +
          '<p class="df-address-privacy">Your address is only used to find your district and is never saved, stored, or shared.</p>' +
        '</form>' +
      '</div>' +

      // Map + Panel layout
      '<div class="df-map-layout">' +
        '<div id="df-map" role="application" aria-label="Interactive map of Arizona\'s 30 legislative districts"></div>' +
        '<div id="df-panel" class="df-panel">' +
          '<div class="df-panel-empty">' +
            '<span class="df-panel-icon" aria-hidden="true">&#128506;</span>' +
            '<h3>Select a District</h3>' +
            '<p>Click on a district in the map or use the address search to see your legislators.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    // District list
    var collapsed = config.districtListCollapsed;
    html += '<div class="df-section df-district-list">' +
      '<div class="df-district-list-header">' +
        '<h2 class="df-section-title">All 30 Legislative Districts</h2>' +
        (collapsed
          ? '<button id="df-district-toggle" class="df-district-toggle" aria-expanded="false">' +
            '<span class="df-toggle-icon">&#9654;</span> Expand' +
            '</button>'
          : '') +
      '</div>' +
      '<span class="df-accent-line"></span>' +
      '<div id="df-district-grid" class="df-district-grid' + (collapsed ? ' df-collapsed' : '') + '"></div>' +
    '</div>';

    // Mobile panel overlay
    html += '<div id="df-panel-overlay" class="df-panel-overlay">' +
      '<div id="df-mobile-panel" class="df-panel"></div>' +
    '</div>';

    containerEl.innerHTML = html;
  }

  /* ---- Map ---- */
  function initMap() {
    map = L.map('df-map', {
      center: [34.2, -111.7],
      zoom: 7,
      minZoom: 6,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | <a href="https://carto.com/">CARTO</a> | Districts: <a href="https://irc.az.gov">AZ IRC</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    fetch(config.geojsonUrl)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        districtGeoJSON = data;
        renderDistricts(data);
      })
      .catch(function(err) { console.error('AZDistrictFinder: failed to load GeoJSON', err); });
  }

  function getDistrictColor(district) {
    var data = legislators[district];
    if (!data) return '#888';
    var party = data.senator.party;
    return PARTY_COLORS[party] || '#888';
  }

  function renderDistricts(geojson) {
    geojsonLayer = L.geoJSON(geojson, {
      style: function(feature) {
        var d = feature.properties.district;
        return {
          fillColor: getDistrictColor(d),
          fillOpacity: 0.35,
          color: '#333',
          weight: 1.5,
          opacity: 0.7
        };
      },
      onEachFeature: function(feature, layer) {
        var d = feature.properties.district;
        var data = legislators[d];
        if (!data) return;

        var reps = data.representatives || [];
        var tooltipContent =
          '<strong>District ' + d + '</strong><br>' +
          '<span style="color:' + (PARTY_COLORS[data.senator.party] || '#888') + '">' +
          data.senator.name + ' (' + data.senator.party + ') - Senate</span>';

        reps.forEach(function(rep) {
          tooltipContent += '<br><span style="color:' + (PARTY_COLORS[rep.party] || '#888') + '">' +
            rep.name + ' (' + rep.party + ') - House</span>';
        });

        layer.bindTooltip(tooltipContent, {
          sticky: true,
          className: 'df-tooltip'
        });

        layer.on('mouseover', function() {
          if (selectedDistrict !== d) {
            layer.setStyle({ fillOpacity: 0.55, weight: 2.5, color: '#000' });
            layer.bringToFront();
          }
        });

        layer.on('mouseout', function() {
          if (selectedDistrict !== d) {
            geojsonLayer.resetStyle(layer);
          }
        });

        layer.on('click', function() {
          selectDistrict(d, layer);
        });

        var center = layer.getBounds().getCenter();
        L.marker(center, {
          icon: L.divIcon({
            className: 'df-district-label',
            html: '<span>' + d + '</span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          }),
          interactive: false
        }).addTo(map);
      }
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
  }

  function selectDistrict(d, layer) {
    if (geojsonLayer) {
      geojsonLayer.eachLayer(function(l) {
        geojsonLayer.resetStyle(l);
      });
    }

    selectedDistrict = d;

    if (layer) {
      layer.setStyle({
        fillOpacity: 0.6,
        weight: 3,
        color: '#D4AF37',
        opacity: 1
      });
      layer.bringToFront();
      map.fitBounds(layer.getBounds(), { padding: [60, 60], maxZoom: 10 });
    }

    showPanel(d);
  }

  function selectDistrictByNumber(d) {
    if (!geojsonLayer) return;
    geojsonLayer.eachLayer(function(layer) {
      if (layer.feature && layer.feature.properties.district === d) {
        selectDistrict(d, layer);
      }
    });
  }

  /* ---- Panel ---- */
  function showPanel(d) {
    var data = legislators[d];
    if (!data) return;

    var currentYear = new Date().getFullYear();
    var mapUrl = data.mapUrl || '';
    var reps = data.representatives || [];

    var html = '<div class="df-panel-header">';
    if (mapUrl) {
      html += '<h3><a href="' + mapUrl + '" target="_blank" rel="noopener" class="df-district-map-link">Legislative District ' + d + '</a></h3>';
    } else {
      html += '<h3>Legislative District ' + d + '</h3>';
    }
    html += '<p class="df-panel-subtitle">' + config.legislature + '</p></div>';

    html += buildLegislatorCard(data.senator, 'State Senator', 'senate', currentYear);
    reps.forEach(function(rep) {
      html += buildLegislatorCard(rep, 'State Representative', 'house', currentYear);
    });

    var copyBtn = '<button class="df-copy-md" data-district="' + d + '" title="Copy as markdown">' +
      '<span class="df-copy-md-icon">&#128203;</span> Copy Markdown' +
      '</button>';
    html += '<div class="df-panel-footer">' + copyBtn + '</div>';

    var panel = containerEl.querySelector('#df-panel');
    if (panel) {
      panel.innerHTML = html;
      initCopyMdButton(panel, d);
    }

    var mobilePanel = containerEl.querySelector('#df-mobile-panel');
    if (mobilePanel) {
      mobilePanel.innerHTML = '<button class="df-panel-close" aria-label="Close">&times;</button>' + html;
      initCopyMdButton(mobilePanel, d);
      var overlay = containerEl.querySelector('#df-panel-overlay');
      if (overlay && window.innerWidth < 1024) {
        overlay.classList.add('active');
        var closeBtn = mobilePanel.querySelector('.df-panel-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', function() {
            overlay.classList.remove('active');
          });
        }
      }
    }

    if (window.innerWidth < 1024 && window.innerWidth >= 768) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function buildLegislatorCard(person, role, chamber, currentYear) {
    var yearsInOffice = currentYear - person.since;
    var partyFull = person.party === 'R' ? 'Republican' : person.party === 'D' ? 'Democrat' : 'Independent';

    var photoHtml;
    if (person.photo) {
      photoHtml = '<img class="df-legislator-photo" src="' + person.photo + '" alt="Photo of ' + person.name + '" onerror="this.onerror=null;this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
        '<div class="df-legislator-photo placeholder" style="display:none;">Photo</div>';
    } else {
      photoHtml = '<div class="df-legislator-photo placeholder">Photo</div>';
    }

    var nameHtml = person.url
      ? '<a href="' + person.url + '" target="_blank" rel="noopener" class="df-legislator-link">' + person.name + '</a>'
      : person.name;

    var emailHtml = person.email
      ? '<li><span>Email</span><span><a href="mailto:' + person.email + '" class="df-email-link">' + person.email + '</a></span></li>'
      : '';

    var phoneHtml = person.phone
      ? '<li><span>Phone</span><span><a href="tel:' + person.phone + '" class="df-email-link">' + person.phone + '</a></span></li>'
      : '';

    return '<div class="df-legislator">' +
      photoHtml +
      '<div class="df-legislator-info">' +
        '<div class="df-legislator-name">' +
          nameHtml +
          '<span class="df-party-badge ' + person.party + '">' + partyFull + '</span>' +
        '</div>' +
        '<div class="df-legislator-role ' + chamber + '">' + role + '</div>' +
        '<ul class="df-legislator-meta">' +
          '<li><span>In Office Since</span><span>' + person.since + '</span></li>' +
          '<li><span>Years Serving</span><span>' + yearsInOffice + ' year' + (yearsInOffice !== 1 ? 's' : '') + '</span></li>' +
          '<li><span>Term Ends</span><span>' + person.termEnds + '</span></li>' +
          '<li><span>Term Length</span><span>' + (chamber === 'senate' ? '4 years' : '2 years') + '</span></li>' +
          emailHtml +
          phoneHtml +
        '</ul>' +
      '</div>' +
    '</div>';
  }

  /* ---- Copy Markdown ---- */
  function initCopyMdButton(container, d) {
    var btn = container.querySelector('.df-copy-md');
    if (!btn) return;
    btn.addEventListener('click', function() {
      var md = buildDistrictMarkdown(d);
      navigator.clipboard.writeText(md).then(function() {
        btn.innerHTML = '<span class="df-copy-md-icon">&#10003;</span> Copied!';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.innerHTML = '<span class="df-copy-md-icon">&#128203;</span> Copy Markdown';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  }

  function buildDistrictMarkdown(d) {
    var data = legislators[d];
    if (!data) return '';

    var currentYear = new Date().getFullYear();
    var mapUrl = data.mapUrl || '';
    var reps = data.representatives || [];
    var lines = [];

    if (mapUrl) {
      lines.push('[**Arizona Legislative District ' + d + '**](' + mapUrl + ') (' + config.legislature + ')');
    } else {
      lines.push('**Arizona Legislative District ' + d + '** (' + config.legislature + ')');
    }
    lines.push('');

    var people = [{ person: data.senator, role: 'Senator', chamber: 'senate' }];
    reps.forEach(function(rep) {
      people.push({ person: rep, role: 'Representative', chamber: 'house' });
    });

    people.forEach(function(p) {
      var partyFull = p.person.party === 'R' ? 'Republican' : p.person.party === 'D' ? 'Democrat' : 'Independent';
      var years = currentYear - p.person.since;
      var nameLink = p.person.url
        ? '[' + p.person.name + '](' + p.person.url + ')'
        : p.person.name;

      lines.push('**' + p.role + ':** ' + nameLink + ' (' + partyFull + ')');
      lines.push('- In office since ' + p.person.since + ' (' + years + ' year' + (years !== 1 ? 's' : '') + ')');
      lines.push('- Term ends ' + p.person.termEnds);
      if (p.person.email) lines.push('- Email: ' + p.person.email);
      if (p.person.phone) lines.push('- Phone: ' + p.person.phone);
      lines.push('');
    });

    if (config.source) {
      lines.push('---');
      lines.push('');
      if (config.sourceUrl) {
        lines.push('*Source: [' + config.source + '](' + config.sourceUrl + ')*');
      } else {
        lines.push('*Source: ' + config.source + '*');
      }
    }

    return lines.join('\n\n');
  }

  /* ---- District List ---- */
  function buildDistrictList() {
    var grid = containerEl.querySelector('#df-district-grid');
    if (!grid) return;

    var html = '';
    for (var d = 1; d <= 30; d++) {
      var data = legislators[d];
      if (!data) continue;
      var reps = data.representatives || [];

      html += '<div class="df-district-card" data-district="' + d + '">' +
        '<h4>District ' + d + '</h4>' +
        '<div class="df-legislator-line"><span class="df-chamber-label">Sen.</span> ' +
          data.senator.name + ' <span class="df-party-badge ' + data.senator.party + '">' + data.senator.party + '</span></div>';

      reps.forEach(function(rep) {
        html += '<div class="df-legislator-line"><span class="df-chamber-label">Rep.</span> ' +
          rep.name + ' <span class="df-party-badge ' + rep.party + '">' + rep.party + '</span></div>';
      });

      html += '</div>';
    }
    grid.innerHTML = html;

    grid.addEventListener('click', function(e) {
      var card = e.target.closest('.df-district-card');
      if (!card) return;
      var d = parseInt(card.dataset.district, 10);
      var mapEl = containerEl.querySelector('#df-map');
      if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      selectDistrictByNumber(d);
    });
  }

  /* ---- District List Toggle ---- */
  function initDistrictToggle() {
    var btn = containerEl.querySelector('#df-district-toggle');
    if (!btn) return;
    var grid = containerEl.querySelector('#df-district-grid');
    if (!grid) return;

    btn.addEventListener('click', function() {
      var isCollapsed = grid.classList.contains('df-collapsed');
      if (isCollapsed) {
        grid.classList.remove('df-collapsed');
        btn.innerHTML = '<span class="df-toggle-icon">&#9660;</span> Collapse';
        btn.setAttribute('aria-expanded', 'true');
      } else {
        grid.classList.add('df-collapsed');
        btn.innerHTML = '<span class="df-toggle-icon">&#9654;</span> Expand';
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Mobile Overlay ---- */
  function initMobileOverlay() {
    var overlay = containerEl.querySelector('#df-panel-overlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    }
  }

  /* ---- Address Search ---- */
  function initAddressSearch() {
    var form = containerEl.querySelector('#df-address-form');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var input = containerEl.querySelector('#df-address-input');
      var errorEl = containerEl.querySelector('#df-address-error');
      var address = (input.value || '').trim();
      errorEl.textContent = '';

      if (!address) {
        errorEl.textContent = 'Please enter an address.';
        return;
      }

      if (!/arizona|AZ/i.test(address)) {
        address += ', Arizona';
      }

      var btn = form.querySelector('.df-address-btn');
      btn.textContent = 'Searching...';
      btn.disabled = true;

      var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' + encodeURIComponent(address);
      fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AZDistrictFinder/1.0 (civic-tool; https://github.com/az-civic-tools/az-civic-tools)'
        }
      })
      .then(function(r) { return r.json(); })
      .then(function(results) {
        btn.textContent = 'Find My District';
        btn.disabled = false;

        if (!results || results.length === 0) {
          errorEl.textContent = 'Address not found. Please try a more specific address.';
          return;
        }

        var lat = parseFloat(results[0].lat);
        var lng = parseFloat(results[0].lon);

        // Arizona bounds check
        if (lat < 31.3 || lat > 37.0 || lng < -114.9 || lng > -109.0) {
          errorEl.textContent = 'That address doesn\'t appear to be in Arizona.';
          return;
        }

        var district = findDistrictForPoint(lat, lng);
        if (district) {
          if (window._dfAddressMarker) {
            map.removeLayer(window._dfAddressMarker);
          }
          window._dfAddressMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'df-address-marker',
              html: '<div class="df-address-pin"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 20]
            })
          }).addTo(map).bindPopup('<strong>Your Location</strong><br>District ' + district).openPopup();

          selectDistrictByNumber(district);
        } else {
          errorEl.textContent = 'Could not determine your legislative district. Try a more specific address.';
        }
      })
      .catch(function() {
        btn.textContent = 'Find My District';
        btn.disabled = false;
        errorEl.textContent = 'Search failed. Please try again.';
      });
    });
  }

  /* ---- Point-in-polygon ---- */
  function findDistrictForPoint(lat, lng) {
    if (!districtGeoJSON) return null;
    for (var i = 0; i < districtGeoJSON.features.length; i++) {
      var feature = districtGeoJSON.features[i];
      if (pointInPolygon(lat, lng, feature.geometry)) {
        return feature.properties.district;
      }
    }
    return null;
  }

  function pointInPolygon(lat, lng, geometry) {
    var rings;
    if (geometry.type === 'Polygon') {
      rings = [geometry.coordinates];
    } else if (geometry.type === 'MultiPolygon') {
      rings = geometry.coordinates;
    } else {
      return false;
    }
    for (var p = 0; p < rings.length; p++) {
      var polygon = rings[p];
      if (raycast(lng, lat, polygon[0])) {
        var inHole = false;
        for (var h = 1; h < polygon.length; h++) {
          if (raycast(lng, lat, polygon[h])) { inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  function raycast(x, y, ring) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1];
      var xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /* ---- Public API ---- */
  return {
    init: init,
    selectDistrict: selectDistrictByNumber
  };

})();

/* Auto-init if df-root element exists */
document.addEventListener('DOMContentLoaded', function() {
  var root = document.getElementById('df-root');
  if (root && root.hasAttribute('data-auto-init')) {
    AZDistrictFinder.init({
      container: root,
      dataUrl: root.getAttribute('data-legislators') || './data/legislators.json',
      geojsonUrl: root.getAttribute('data-geojson') || './data/az-districts.geojson',
      source: root.getAttribute('data-source') || '',
      sourceUrl: root.getAttribute('data-source-url') || '',
      districtListCollapsed: root.getAttribute('data-district-list-collapsed') !== 'false'
    });
  }
});
