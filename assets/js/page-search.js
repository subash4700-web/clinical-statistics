// In-page text search for theory pages.
//
// Adds a small floating search bar (top-right of the content) with an input,
// prev/next buttons, and a match counter. Highlights all matches in the
// page content and scrolls to the current one. Scoped to .section elements
// (skips the Contents TOC and the page <h1>/lead).
//
// Usage: include once in any theory page, after the body content:
//   <script src="assets/js/page-search.js" defer></script>
//
// Keyboard:
//   Cmd/Ctrl+F  → focus the bar (also still triggers native find, harmless)
//   Enter       → next match
//   Shift+Enter → previous match
//   Esc         → clear and hide

(function () {
  'use strict';

  const HIGHLIGHT_CLASS = 'pagesearch-hit';
  const CURRENT_CLASS = 'pagesearch-current';

  // Inject styles once.
  const style = document.createElement('style');
  style.textContent = `
    .${HIGHLIGHT_CLASS}{background:#fef08a;color:#713f12;border-radius:2px;padding:0 1px;}
    .${CURRENT_CLASS}{background:#f59e0b !important;color:#fff !important;box-shadow:0 0 0 2px #f59e0b33;}
    #pagesearch-bar{position:fixed;top:14px;right:18px;z-index:10000;background:#1e293b;color:#e2e8f0;
      border-radius:10px;padding:6px 8px;display:flex;align-items:center;gap:6px;font-size:12px;
      box-shadow:0 8px 24px rgba(0,0,0,.25);font-family:system-ui,-apple-system,sans-serif;}
    #pagesearch-bar input{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;
      padding:5px 8px;font-size:12px;width:180px;outline:none;}
    #pagesearch-bar input:focus{border-color:#60a5fa;}
    #pagesearch-bar button{background:#334155;color:#e2e8f0;border:none;border-radius:6px;padding:4px 8px;
      cursor:pointer;font-size:12px;font-weight:700;}
    #pagesearch-bar button:hover{background:#475569;}
    #pagesearch-count{color:#94a3b8;font-size:11px;min-width:40px;text-align:center;}
    #pagesearch-toggle{position:fixed;top:14px;right:18px;z-index:9999;background:#1e293b;color:#e2e8f0;
      border:none;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,.2);font-family:system-ui,-apple-system,sans-serif;}
    #pagesearch-toggle:hover{background:#334155;}
  `;
  document.head.appendChild(style);

  // The toggle button lives in the parent app toolbar (next to Report).
  // Expose an opener so the parent can call window.openPageSearch().
  // Falls back to an in-iframe toggle only if loaded standalone (no parent).
  let toggle = null;
  if (window.self === window.top) {
    toggle = document.createElement('button');
    toggle.id = 'pagesearch-toggle';
    toggle.textContent = '🔍 Search page';
    toggle.title = 'Search this page (Cmd/Ctrl+F)';
    document.body.appendChild(toggle);
  }

  // Bar (hidden until opened).
  const bar = document.createElement('div');
  bar.id = 'pagesearch-bar';
  bar.style.display = 'none';
  bar.innerHTML = `
    <input type="text" id="pagesearch-input" placeholder="Search this page..." />
    <span id="pagesearch-count">0/0</span>
    <button id="pagesearch-prev" title="Previous (Shift+Enter)">↑</button>
    <button id="pagesearch-next" title="Next (Enter)">↓</button>
    <button id="pagesearch-close" title="Close (Esc)">✕</button>
  `;
  document.body.appendChild(bar);

  const input = bar.querySelector('#pagesearch-input');
  const counter = bar.querySelector('#pagesearch-count');

  let hits = [];
  let cursor = -1;

  // Search roots: every .section. Falls back to <main>/body if no sections.
  function searchRoots() {
    const sections = document.querySelectorAll('.section');
    return sections.length ? Array.from(sections) : [document.body];
  }

  function clearHighlights() {
    document.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(el => {
      const parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      parent.normalize();
    });
    hits = [];
    cursor = -1;
    counter.textContent = '0/0';
  }

  function escapeRE(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function highlight(query) {
    clearHighlights();
    if (!query || query.length < 2) return;
    const re = new RegExp(escapeRE(query), 'gi');

    const roots = searchRoots();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        if (p.closest('.' + HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
        if (p.closest('#pagesearch-bar') || p.closest('#pagesearch-toggle')) return NodeFilter.FILTER_REJECT;
        // Must be inside one of the search roots.
        for (let i = 0; i < roots.length; i++) if (roots[i].contains(n)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_REJECT;
      }
    });
    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    textNodes.forEach(node => {
      const text = node.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) return;
      re.lastIndex = 0;

      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = HIGHLIGHT_CLASS;
        span.textContent = m[0];
        frag.appendChild(span);
        hits.push(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });

    if (hits.length) {
      cursor = 0;
      updateCurrent();
    }
    counter.textContent = hits.length ? (cursor + 1) + '/' + hits.length : '0/0';
  }

  function updateCurrent() {
    document.querySelectorAll('.' + CURRENT_CLASS).forEach(el => el.classList.remove(CURRENT_CLASS));
    if (cursor < 0 || cursor >= hits.length) return;
    const el = hits[cursor];
    el.classList.add(CURRENT_CLASS);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    counter.textContent = (cursor + 1) + '/' + hits.length;
  }

  function next() { if (!hits.length) return; cursor = (cursor + 1) % hits.length; updateCurrent(); }
  function prev() { if (!hits.length) return; cursor = (cursor - 1 + hits.length) % hits.length; updateCurrent(); }

  function open() {
    if (toggle) toggle.style.display = 'none';
    bar.style.display = 'flex';
    input.focus();
    input.select();
  }
  function close() {
    bar.style.display = 'none';
    if (toggle) toggle.style.display = '';
    clearHighlights();
    input.value = '';
  }
  // Expose opener to the parent frame.
  window.openPageSearch = open;
  if (toggle) toggle.addEventListener('click', open);
  bar.querySelector('#pagesearch-close').addEventListener('click', close);
  bar.querySelector('#pagesearch-next').addEventListener('click', next);
  bar.querySelector('#pagesearch-prev').addEventListener('click', prev);

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => highlight(input.value.trim()), 120);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prev(); else next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  // Cmd/Ctrl+F also opens the bar (does not prevent native find; user can still use it).
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      // Don't preventDefault — let native find still work in the iframe too.
      open();
    }
  });
})();
