// Auto-numbering, auto-TOC sync, and auto in-text section references for theory pages.
//
// Usage: include once in any theory page, after the page content:
//   <script src="assets/js/auto-toc.js" defer></script>
//
// Conventions the script relies on:
//   - Each numbered section is a <div class="section" id="..."> containing one <h2>.
//   - The <h2> may start with "N. " (any digits) — the script overwrites N with the
//     section's actual position in DOM order. Inline <span> badges are stripped when
//     building TOC text but left untouched in the heading itself.
//   - The Contents block is <div class="index"> containing one or more <ol> blocks
//     (one per group). Each TOC item is <li><a href="#section-id">…</a></li>.
//     Group headings, ordering, and which sections belong to which group remain
//     manual; the script only updates link text and each <ol>'s start attribute.
//   - In-text cross-references are written as <a href="#id" data-secref></a>
//     (renders as "section N", clickable). Use data-secref="Section" for capital S.
//
// Adding a new section: insert the <div class="section" id="..."> in the desired
// DOM position and add a <li><a href="#new-id"></a></li> to the right group <ol>.
// The number, TOC label, and any cross-references update on next page load.

(function autoTOC() {
  const numById = {};

  // 1. Number sections in DOM order, rewriting the leading "N. " of each <h2>.
  document.querySelectorAll('.section[id]').forEach((sec, i) => {
    const num = i + 1;
    numById[sec.id] = num;
    const h2 = sec.querySelector('h2');
    if (!h2) return;
    const first = h2.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) {
      first.nodeValue = num + '. ' +
        first.nodeValue.replace(/^\s*\d+\.\s*/, '').replace(/^\s+/, '');
    }
  });

  // 2. Fill in-text references: <a href="#id" data-secref></a> → "section N".
  document.querySelectorAll('a[data-secref]').forEach(a => {
    const id = a.getAttribute('href').slice(1);
    const num = numById[id];
    if (!num) return;
    const label = a.getAttribute('data-secref') || 'section';
    a.textContent = label + ' ' + num;
    if (!a.style.color) a.style.color = '#1e40af';
    if (!a.style.fontWeight) a.style.fontWeight = '600';
  });

  // 3. Sync TOC link text with current <h2> titles, set each <ol>'s start.
  document.querySelectorAll('.index ol').forEach(ol => {
    let firstNum = null;
    ol.querySelectorAll('a[href^="#"]').forEach(a => {
      const id = a.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (!sec) return;
      const h2 = sec.querySelector('h2');
      if (!h2) return;
      const clone = h2.cloneNode(true);
      // Drop only badge spans (have a background style), keep tooltip-wrapped terms.
      clone.querySelectorAll('span').forEach(s => {
        const style = s.getAttribute('style') || '';
        if (/background\s*:/i.test(style)) s.remove();
      });
      const txt = clone.textContent.trim().replace(/^\d+\.\s*/, '');
      if (txt) a.textContent = txt;
      if (firstNum === null && numById[id]) firstNum = numById[id];
    });
    if (firstNum !== null) ol.setAttribute('start', firstNum);
  });

  const indexBlock = document.querySelector('.index');

  // 5. Mini-TOC docked into the existing .font-toolbar (top sticky bar).
  //    "Contents" button with a dropdown panel below it containing all sections + tools.
  const toolbar = document.querySelector('.font-toolbar');
  if (indexBlock && toolbar) {
    const style = document.createElement('style');
    style.textContent = `
      #mini-toc-dock { position: relative; margin-right: auto; }
      #mini-toc-btn { display: inline-flex; align-items: center; gap: 6px;
        padding: 3px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
        background: white; cursor: pointer; font-weight: 700; color: #374151;
        font-family: inherit; font-size: 12px; transition: background .12s; }
      #mini-toc-btn:hover { background: #f3f4f6; }
      #mini-toc-btn-chevron { font-size: 9px; color: #6b7280; transition: transform .15s; }
      #mini-toc-dock.open #mini-toc-btn-chevron { transform: rotate(180deg); }
      #mini-toc-panel { display: none; position: absolute; top: calc(100% + 6px); left: 0;
        z-index: 200; width: 320px; max-height: 65vh; overflow-y: auto;
        background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.08); padding: 10px 14px; }
      #mini-toc-dock.open #mini-toc-panel { display: block; }
      #mini-toc-panel a { display: block; color: #0d766e; text-decoration: none;
        font-size: 12px; font-weight: 600; padding: 3px 0; line-height: 1.4; }
      #mini-toc-panel a:hover { text-decoration: underline; }
      #mini-toc-panel .mini-toc-group { font-size: 10px; font-weight: 800;
        text-transform: uppercase; letter-spacing: .07em; color: #0d9488;
        margin: 10px 0 4px; }
      #mini-toc-panel .mini-toc-group:first-child { margin-top: 0; }
    `;
    document.head.appendChild(style);

    const dock = document.createElement('div');
    dock.id = 'mini-toc-dock';
    dock.innerHTML =
      '<button id="mini-toc-btn" type="button">' +
        '<span>☰ Contents</span>' +
        '<span id="mini-toc-btn-chevron">▼</span>' +
      '</button>' +
      '<div id="mini-toc-panel"></div>';
    // Insert as the first child of the toolbar so it sits on the left
    toolbar.insertBefore(dock, toolbar.firstChild);

    // Populate panel from the main indexBlock — group headers + links in order.
    const panel = dock.querySelector('#mini-toc-panel');
    Array.from(indexBlock.children).forEach(child => {
      if (child.tagName === 'DIV' && /font-weight:\s*800/i.test(child.getAttribute('style') || '')) {
        const g = document.createElement('div');
        g.className = 'mini-toc-group';
        g.textContent = child.textContent;
        panel.appendChild(g);
      } else if (child.tagName === 'OL' || child.tagName === 'UL') {
        child.querySelectorAll('a').forEach(a => {
          const clone = a.cloneNode(true);
          if (a.onclick) clone.onclick = a.onclick;
          // Close the dropdown when a link is clicked
          clone.addEventListener('click', () => dock.classList.remove('open'));
          panel.appendChild(clone);
        });
      }
    });

    // Toggle dropdown
    dock.querySelector('#mini-toc-btn').addEventListener('click', e => {
      e.stopPropagation();
      dock.classList.toggle('open');
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!dock.contains(e.target)) dock.classList.remove('open');
    });
  }
})();
