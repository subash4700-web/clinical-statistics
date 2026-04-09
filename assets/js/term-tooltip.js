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
  var lookup = {};   // label (lowercase) → term object
  // Skip terms marked noTooltip (glossary-only)
  var tooltipTerms = terms.filter(function(t) { return !t.noTooltip; });
  // Build lookup using match field (short symbol) or label
  tooltipTerms.forEach(function(t) {
    var key = (t.match || t.label).toLowerCase();
    lookup[key] = t;
  });

  /* Sorted labels longest-first to avoid partial matches */
  var labels = tooltipTerms.map(function(t){ return t.match || t.label; });
  labels.sort(function(a, b){ return b.length - a.length; });

  /* ── Auto-mark text nodes ── */
  function escapeRE(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Build one combined regex: longest patterns first */
  var pattern = labels.map(escapeRE).join('|');
  var re = new RegExp('(?<![\\w])(' + pattern + ')(?![\\w%²])', 'g');

  function markNode(textNode) {
    var text = textNode.nodeValue;
    if (!re.test(text)) return;
    re.lastIndex = 0;

    var frag = document.createDocumentFragment();
    var last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      var matched = m[1];
      var term = lookup[matched.toLowerCase()];
      if (!term) continue;

      // Text before match
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));

      // Marked span
      var span = document.createElement('span');
      span.className = 'fagterm';
      span.textContent = matched;
      span.dataset.termId = term.id;
      span.addEventListener('mouseenter', function(e){ showTip(e, lookup[this.dataset.termId] || lookup[this.textContent.toLowerCase()]); });
      span.addEventListener('mousemove',  positionTip);
      span.addEventListener('mouseleave', hideTip);
      frag.appendChild(span);

      last = m.index + matched.length;
    }
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
