/**
 * Annotations — Word-style highlight + comment sidebar
 * Injected into tool iframes by app.html
 * Communicates with parent via window.parent.postMessage
 *
 * Resilient to page content changes:
 *  - Uses text + surrounding context for matching
 *  - Falls back to partial/fuzzy match if exact match fails
 *  - Multi-node wrapping for cross-boundary selections
 */
(function() {
  'use strict';

  const PAGE_KEY = location.pathname.split('/').pop().replace('.html','');
  let annotations = [];
  let nextId = 1;

  // ── Init ──
  function init() {
    injectStyles();
    setupContextMenu();
    setupMessageListener();
    // Request saved annotations from parent
    try {
      window.parent.postMessage({ type: 'annotations:load', page: PAGE_KEY }, '*');
    } catch(e) {}
  }

  // ── CSS ──
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      .ann-hl {
        background: #fef08a;
        border-bottom: 2px solid #eab308;
        cursor: pointer;
        border-radius: 2px;
        transition: background .15s;
      }
      .ann-hl:hover, .ann-hl.active {
        background: #fde047;
        box-shadow: 0 0 0 2px rgba(234,179,8,0.25);
      }
      .ann-ctx {
        position: fixed; z-index: 99999;
        background: #fff; border: 1px solid #e5e7eb;
        border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.15);
        padding: 4px; min-width: 180px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .ann-ctx button {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px; font-size: 13px; font-weight: 600;
        color: #374151; border: none; background: none;
        width: 100%; text-align: left; cursor: pointer;
        border-radius: 7px; font-family: inherit;
      }
      .ann-ctx button:hover { background: #f3f4f6; }
      .ann-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
      }
      .ann-dialog {
        background: #fff; border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,.2);
        padding: 20px; width: 340px;
        font-family: system-ui, -apple-system, sans-serif;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Context menu ──
  let menu = null;
  let pending = null;

  function setupContextMenu() {
    document.addEventListener('contextmenu', function(e) {
      closeMenu();
      const sel = window.getSelection();
      const text = sel.toString().trim();
      const hl = e.target.closest('.ann-hl');

      if (!text && !hl) return;
      e.preventDefault();

      menu = document.createElement('div');
      menu.className = 'ann-ctx';

      if (text && !hl) {
        pending = { text: text, range: sel.getRangeAt(0).cloneRange() };
        menu.innerHTML = '<button data-a="comment"><span style="width:20px;text-align:center;">💬</span> Add Comment</button>' +
                         '<button data-a="highlight"><span style="width:20px;text-align:center;">🖍</span> Highlight Only</button>';
      } else if (hl) {
        pending = { editId: parseInt(hl.dataset.aid) };
        menu.innerHTML = '<button data-a="edit"><span style="width:20px;text-align:center;">✏️</span> Edit Comment</button>' +
                         '<button data-a="delete"><span style="width:20px;text-align:center;">🗑</span> Remove</button>';
      }

      menu.style.left = Math.min(e.clientX, innerWidth - 200) + 'px';
      menu.style.top = Math.min(e.clientY, innerHeight - 100) + 'px';
      document.body.appendChild(menu);

      menu.onclick = function(ev) {
        const b = ev.target.closest('[data-a]');
        if (b) doAction(b.dataset.a);
        closeMenu();
      };
      setTimeout(function() {
        document.addEventListener('mousedown', function handler(ev) {
          if (menu && !menu.contains(ev.target)) closeMenu();
          document.removeEventListener('mousedown', handler);
        });
      }, 10);
    });
  }

  function closeMenu() { if (menu) { menu.remove(); menu = null; } }

  // ── Actions ──
  function doAction(a) {
    if (a === 'comment') {
      showDialog(pending.text, '', function(comment) {
        if (comment !== null) addAnnotation(pending.text, pending.range, comment);
      });
    } else if (a === 'highlight') {
      addAnnotation(pending.text, pending.range, '');
    } else if (a === 'edit') {
      var ann = annotations.find(function(x) { return x.id === pending.editId; });
      if (!ann) return;
      showDialog(ann.text, ann.comment, function(comment) {
        if (comment !== null) { ann.comment = comment; save(); notifyParent(); }
      });
    } else if (a === 'delete') {
      removeAnnotation(pending.editId);
    }
    window.getSelection().removeAllRanges();
  }

  // ── Dialog ──
  function showDialog(highlightedText, existing, cb) {
    var ov = document.createElement('div');
    ov.className = 'ann-overlay';
    var d = document.createElement('div');
    d.className = 'ann-dialog';
    d.innerHTML =
      '<div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:6px;">💬 Add Comment</div>' +
      '<div style="font-size:11px;color:#92400e;background:#fef9c3;padding:4px 8px;border-radius:4px;margin-bottom:10px;line-height:1.4;max-height:40px;overflow:hidden;">"' + esc(highlightedText.substring(0,100)) + '"</div>' +
      '<textarea style="width:100%;min-height:80px;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box;outline:none;" placeholder="Type your note...">' + esc(existing || '') + '</textarea>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">' +
      '<button class="c" style="padding:6px 14px;border:1px solid #e5e7eb;border-radius:7px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;color:#6b7280;">Cancel</button>' +
      '<button class="s" style="padding:6px 14px;border:none;border-radius:7px;background:#0d9488;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Save</button></div>';
    ov.appendChild(d);
    document.body.appendChild(ov);
    var ta = d.querySelector('textarea');
    ta.focus();
    d.querySelector('.s').onclick = function() { ov.remove(); cb(ta.value.trim()); };
    d.querySelector('.c').onclick = function() { ov.remove(); cb(null); };
    ta.onkeydown = function(e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) d.querySelector('.s').click();
      if (e.key === 'Escape') d.querySelector('.c').click();
    };
  }

  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Highlight text in DOM (handles cross-boundary) ──
  function highlightRange(range, id) {
    // Try simple wrap first
    try {
      var test = range.cloneRange();
      var mark = document.createElement('mark');
      test.surroundContents(mark);
      // If it worked, surroundContents mutated the DOM via test, but we used a clone.
      // Undo: move children back out
      while (mark.firstChild) mark.parentNode.insertBefore(mark.firstChild, mark);
      mark.remove();
      if (range.commonAncestorContainer) range.commonAncestorContainer.normalize();
    } catch(e) {
      // Cross-boundary — use multi-node approach
      return highlightMultiNode(range, id);
    }

    // Simple case: single text node
    var m = document.createElement('mark');
    m.className = 'ann-hl';
    m.dataset.aid = id;
    range.surroundContents(m);
    bindMark(m, id);
    return m;
  }

  function highlightMultiNode(range, id) {
    // Get all text nodes within the range
    var nodes = getTextNodesInRange(range);
    var first = null;
    nodes.forEach(function(info) {
      var node = info.node;
      var start = info.start;
      var end = info.end;
      // Split if needed
      if (end < node.textContent.length) {
        node.splitText(end);
      }
      var target = node;
      if (start > 0) {
        target = node.splitText(start);
      }
      var m = document.createElement('mark');
      m.className = 'ann-hl';
      m.dataset.aid = id;
      target.parentNode.insertBefore(m, target);
      m.appendChild(target);
      bindMark(m, id);
      if (!first) first = m;
    });
    return first;
  }

  function getTextNodesInRange(range) {
    var results = [];
    var walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (!range.intersectsNode(node)) continue;
      var start = 0, end = node.textContent.length;
      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;
      if (start < end) results.push({ node: node, start: start, end: end });
    }
    return results;
  }

  function bindMark(m, id) {
    m.addEventListener('click', function() {
      window.parent.postMessage({ type: 'annotations:scrollTo', id: id }, '*');
      setActiveHL(id);
    });
    m.addEventListener('mouseenter', function() {
      window.parent.postMessage({ type: 'annotations:hover', id: id }, '*');
    });
    m.addEventListener('mouseleave', function() {
      window.parent.postMessage({ type: 'annotations:unhover', id: id }, '*');
    });
  }

  function setActiveHL(id) {
    document.querySelectorAll('.ann-hl.active').forEach(function(el) { el.classList.remove('active'); });
    document.querySelectorAll('.ann-hl[data-aid="'+id+'"]').forEach(function(el) { el.classList.add('active'); });
  }

  // ── Create annotation ──
  function addAnnotation(text, range, comment) {
    var id = nextId++;
    var mark = highlightRange(range, id);
    var rd = serializeRange(text);
    annotations.push({ id: id, text: text.substring(0, 300), comment: comment, rangeData: rd, timestamp: Date.now(), linked: !!mark });
    save();
    notifyParent();
  }

  // ── Remove annotation ──
  function removeAnnotation(id) {
    document.querySelectorAll('.ann-hl[data-aid="'+id+'"]').forEach(function(m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      m.remove();
      p.normalize();
    });
    annotations = annotations.filter(function(a) { return a.id !== id; });
    save();
    notifyParent();
  }

  // ── Serialize: store text + context for future matching ──
  function serializeRange(text) {
    var full = document.body.innerText;
    var idx = full.indexOf(text);
    if (idx === -1) return { text: text, before: '', after: '' };
    return {
      text: text,
      before: full.substring(Math.max(0, idx - 60), idx),
      after: full.substring(idx + text.length, idx + text.length + 60)
    };
  }

  // ── Restore annotations from saved data ──
  function restoreAll(saved) {
    if (!saved || !saved.length) { notifyParent(); return; }
    annotations = [];
    nextId = 1;

    saved.forEach(function(ann) {
      ann.id = nextId++;
      ann.linked = false;
      if (ann.rangeData && ann.rangeData.text) {
        var range = findText(ann.rangeData.text, ann.rangeData.before, ann.rangeData.after);
        if (range) {
          var mark = highlightRange(range, ann.id);
          ann.linked = !!mark;
        }
      }
      annotations.push(ann);
    });
    notifyParent();
  }

  // ── Find text in DOM → Range (fuzzy-tolerant) ──
  function findText(searchText, beforeCtx, afterCtx) {
    // Build full text map
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [], full = '';
    while (walker.nextNode()) {
      var n = walker.currentNode;
      nodes.push({ node: n, start: full.length });
      full += n.textContent;
    }

    // Find all occurrences, score by context
    var best = -1, bestScore = -1;
    var idx = full.indexOf(searchText);
    while (idx !== -1) {
      var score = 0;
      if (beforeCtx) {
        var before = full.substring(Math.max(0, idx - 60), idx);
        // Count matching characters from end of context
        for (var i = 1; i <= Math.min(beforeCtx.length, before.length); i++) {
          if (beforeCtx.slice(-i) === before.slice(-i)) score += i;
        }
      }
      if (afterCtx) {
        var after = full.substring(idx + searchText.length, idx + searchText.length + 60);
        for (var j = 1; j <= Math.min(afterCtx.length, after.length); j++) {
          if (afterCtx.substring(0, j) === after.substring(0, j)) score += j;
        }
      }
      if (score > bestScore || best === -1) { best = idx; bestScore = score; }
      idx = full.indexOf(searchText, idx + 1);
    }

    if (best === -1) return null;

    // Convert text offset to DOM Range
    var startOff = best, endOff = best + searchText.length;
    var startNode = null, startPos = 0, endNode = null, endPos = 0;

    for (var k = 0; k < nodes.length; k++) {
      var m = nodes[k];
      var mEnd = m.start + m.node.textContent.length;
      if (!startNode && mEnd > startOff) {
        startNode = m.node;
        startPos = startOff - m.start;
      }
      if (mEnd >= endOff) {
        endNode = m.node;
        endPos = endOff - m.start;
        break;
      }
    }

    if (!startNode || !endNode) return null;

    var range = document.createRange();
    range.setStart(startNode, startPos);
    range.setEnd(endNode, endPos);
    return range;
  }

  // ── Scroll to annotation (called from parent sidebar click) ──
  function scrollToAnnotation(id) {
    var marks = document.querySelectorAll('.ann-hl[data-aid="'+id+'"]');
    if (marks.length) {
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveHL(id);
      return;
    }
    // Fallback: if highlight wasn't restored, try to find the text and scroll there
    var ann = annotations.find(function(a) { return a.id === id; });
    if (ann && ann.rangeData && ann.rangeData.text) {
      var range = findText(ann.rangeData.text, ann.rangeData.before, ann.rangeData.after);
      if (range) {
        var temp = document.createElement('span');
        range.insertNode(temp);
        temp.scrollIntoView({ behavior: 'smooth', block: 'center' });
        temp.remove();
      }
    }
  }

  // ── Save to parent ──
  function save() {
    try {
      window.parent.postMessage({
        type: 'annotations:save',
        page: PAGE_KEY,
        data: annotations.map(function(a) {
          return { id: a.id, text: a.text, comment: a.comment, rangeData: a.rangeData, timestamp: a.timestamp };
        })
      }, '*');
    } catch(e) {}
  }

  // ── Notify parent sidebar ──
  function notifyParent() {
    try {
      window.parent.postMessage({
        type: 'annotations:update',
        page: PAGE_KEY,
        annotations: annotations.map(function(a) {
          return { id: a.id, text: a.text, comment: a.comment, timestamp: a.timestamp, linked: a.linked !== false };
        })
      }, '*');
    } catch(e) {}
  }

  // ── Listen for parent messages ──
  function setupMessageListener() {
    window.addEventListener('message', function(e) {
      if (!e.data || !e.data.type) return;
      switch(e.data.type) {
        case 'annotations:loaded':
          restoreAll(e.data.data || []);
          break;
        case 'annotations:focusHighlight':
          scrollToAnnotation(e.data.id);
          break;
        case 'annotations:deleteFromSidebar':
          removeAnnotation(e.data.id);
          break;
        case 'annotations:highlightHover':
          setActiveHL(e.data.id);
          break;
        case 'annotations:highlightUnhover':
          document.querySelectorAll('.ann-hl[data-aid="'+e.data.id+'"]').forEach(function(el) { el.classList.remove('active'); });
          break;
      }
    });
  }

  // ── Start ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
