/* term-tooltip.js
   Auto-marks known clinical terms in .section elements and shows a hover tooltip.
   Requires terms.js to be loaded first.
*/
(function() {
  'use strict';

  /* ── Tooltip element ── */
  var tip = document.createElement('div');
  tip.id = 'termTip';
  tip.style.cssText = [
    'position:fixed','z-index:9999','max-width:320px','pointer-events:none',
    'background:#1e293b','color:#e2e8f0','border-radius:10px',
    'padding:11px 14px','font-size:12px','line-height:1.65',
    'box-shadow:0 8px 24px rgba(0,0,0,.25)','opacity:0',
    'transition:opacity .15s','font-family:system-ui,-apple-system,sans-serif',
  ].join(';');
  document.body.appendChild(tip);

  function showTip(e, term) {
    tip.innerHTML =
      '<div style="font-weight:800;font-size:13px;color:#f1f5f9;margin-bottom:5px;">' + term.label + '</div>' +
      '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">' + term.category + '</div>' +
      term.def;
    tip.style.opacity = '1';
    positionTip(e);
  }

  function positionTip(e) {
    var x = e.clientX + 14;
    var y = e.clientY + 14;
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
    // Keep within viewport
    var rect = tip.getBoundingClientRect();
    if (rect.right > window.innerWidth - 12)  tip.style.left = (e.clientX - rect.width - 10) + 'px';
    if (rect.bottom > window.innerHeight - 12) tip.style.top = (e.clientY - rect.height - 10) + 'px';
  }

  function hideTip() { tip.style.opacity = '0'; }

  /* ── Build lookup map ── */
  var terms = window.CLINICAL_TERMS || [];
  var lookupCI = {}; // case-insensitive lookup (default): lowercase key → term
  var lookupCS = {}; // case-sensitive lookup: exact key → term
  // Skip terms marked noTooltip (glossary-only)
  var tooltipTerms = terms.filter(function(t) { return !t.noTooltip; });
  // Build lookup using match field (short symbol) or label
  tooltipTerms.forEach(function(t) {
    var key = (t.match || t.label);
    if (t.caseSensitive) lookupCS[key] = t;
    else lookupCI[key.toLowerCase()] = t;
  });

  /* Sorted labels longest-first to avoid partial matches */
  var labelsCI = tooltipTerms.filter(function(t){return !t.caseSensitive;}).map(function(t){ return t.match || t.label; });
  var labelsCS = tooltipTerms.filter(function(t){return t.caseSensitive;}).map(function(t){ return t.match || t.label; });
  labelsCI.sort(function(a, b){ return b.length - a.length; });
  labelsCS.sort(function(a, b){ return b.length - a.length; });

  /* ── Auto-mark text nodes ── */
  function escapeRE(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Two regexes: case-insensitive (default) and case-sensitive (for short acronyms) */
  var reCI = labelsCI.length ? new RegExp('(?<![\\w])(' + labelsCI.map(escapeRE).join('|') + ')(?![\\w%²])', 'gi') : null;
  var reCS = labelsCS.length ? new RegExp('(?<![\\w])(' + labelsCS.map(escapeRE).join('|') + ')(?![\\w%²])', 'g') : null;

  // Build a termById map so mouseenter can re-find the term cheaply.
  var termById = {};
  tooltipTerms.forEach(function(t){ termById[t.id] = t; });

  function collectMatches(text) {
    var hits = [];
    function run(re, lookup, caseSensitive) {
      if (!re) return;
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(text)) !== null) {
        var matched = m[1];
        var term = caseSensitive ? lookup[matched] : lookup[matched.toLowerCase()];
        if (!term) continue;
        hits.push({ start: m.index, end: m.index + matched.length, matched: matched, term: term });
      }
    }
    run(reCI, lookupCI, false);
    run(reCS, lookupCS, true);
    hits.sort(function(a, b){ return a.start - b.start || b.end - a.end; });
    // Drop overlapping matches (longer-first is already preferred within each regex).
    var filtered = [];
    var lastEnd = -1;
    hits.forEach(function(h){
      if (h.start >= lastEnd) { filtered.push(h); lastEnd = h.end; }
    });
    return filtered;
  }

  function markNode(textNode) {
    var text = textNode.nodeValue;
    var hits = collectMatches(text);
    if (!hits.length) return;

    var frag = document.createDocumentFragment();
    var last = 0;
    hits.forEach(function(h){
      if (h.start > last) frag.appendChild(document.createTextNode(text.slice(last, h.start)));
      var span = document.createElement('span');
      span.className = 'fagterm';
      span.textContent = h.matched;
      span.dataset.termId = h.term.id;
      span.addEventListener('mouseenter', function(e){ showTip(e, termById[this.dataset.termId]); });
      span.addEventListener('mousemove',  positionTip);
      span.addEventListener('mouseleave', hideTip);
      frag.appendChild(span);
      last = h.end;
    });
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function markContainer(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName;
        /* Skip: already marked, code blocks, scripts, formula boxes */
        if (p.classList && p.classList.contains('fagterm')) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT','STYLE','CODE','PRE','TEXTAREA'].indexOf(tag) >= 0) return NodeFilter.FILTER_REJECT;
        if (p.classList && (p.classList.contains('formula-box') || p.classList.contains('index'))) return NodeFilter.FILTER_REJECT;
        /* Skip SVG content — <span> wrappers don't render inside SVG <text> elements. */
        if (p.closest && p.closest('svg')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);

    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(markNode);
  }

  /* ── Inject CSS ── */
  var style = document.createElement('style');
  style.textContent =
    '.fagterm{border-bottom:1.5px dotted currentColor;cursor:help;text-decoration-skip-ink:none;}' +
    '.fagterm:hover{opacity:.75;}';
  document.head.appendChild(style);

  /* ── Run after DOM ready ── */
  function init() {
    /* Mark .section elements (theory pages) and .rpt-section bodies (tools) */
    document.querySelectorAll(
      '.section, .wrap > p, .wrap > ul, .wrap > table, ' +
      '.rpt-sec-body, #resultsArea, #statusArea, .kpi-grid, .result-block, .stat-table'
    ).forEach(markContainer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
