// ── Shared report section helpers ────────────────────────────────────────────
// Used by all tools that support "Add to Report" with collapsible sections.

function toggleRptSection(hdr) {
  var sec   = hdr.closest('.rpt-section');
  var body  = sec.querySelector('.rpt-sec-body');
  var badge = hdr.querySelector('.rpt-sec-badge');
  var arrow = hdr.querySelector('.rpt-sec-arrow');
  var isOpen = sec.getAttribute('data-open') === 'true';
  if (isOpen) {
    sec.setAttribute('data-open', 'false');
    body.style.display = 'none';
    badge.textContent = 'Excluded';
    badge.className = 'rpt-sec-badge rpt-badge-ex';
    if (arrow) arrow.textContent = '▶';
  } else {
    sec.setAttribute('data-open', 'true');
    body.style.display = '';
    badge.textContent = 'In report';
    badge.className = 'rpt-sec-badge rpt-badge-in';
    if (arrow) arrow.textContent = '▼';
  }
}

// Capture current tool state (for report-entry editing).
// Tries custom getSaveData() hook first, falls back to generic field capture.
function captureToolState() {
  try {
    if (typeof window.getSaveData === 'function') {
      return { custom: true, data: window.getSaveData() };
    }
    var fields = {};
    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(function(el) {
      if (el.type === 'checkbox' || el.type === 'radio') fields[el.id] = el.checked;
      else fields[el.id] = el.value;
    });
    return Object.keys(fields).length ? { custom: false, data: fields } : null;
  } catch(e) { return null; }
}

// Collect all expanded sections and send to parent report builder.
// toolName: string shown in report panel
// analyte:  string shown as subtitle (test name, variable, etc.)
// chartMap: optional object { sectionId: chartJsInstance } for canvas capture
function collectAndAddToReport(toolName, analyte, chartMap) {
  chartMap = chartMap || {};
  var html = '';

  document.querySelectorAll('.rpt-section[data-open="true"]').forEach(function(sec) {
    var title = sec.querySelector('.rpt-sec-title');
    var body  = sec.querySelector('.rpt-sec-body');
    var secId = sec.getAttribute('data-sec-id') || '';
    var titleText = title ? title.textContent : '';

    var content = '';

    // If this section has a registered chart, capture it as image
    if (secId && chartMap[secId]) {
      try {
        content += '<img src="' + chartMap[secId].toBase64Image('image/png', 1.0) + '" style="max-width:100%;margin:8px 0;">';
      } catch(e) {}
    }

    // Add any canvas elements inside the body that weren't already captured
    if (body) {
      var canvases = body.querySelectorAll('canvas');
      canvases.forEach(function(canvas) {
        // Skip canvases inside hidden data-acr elements (would produce blank images)
        var acrParent = canvas.closest('[data-acr="hide"]');
        if (acrParent && acrParent.style.display === 'none') return;
        try {
          content += '<img src="' + canvas.toDataURL('image/png') + '" style="max-width:100%;margin:8px 0;">';
        } catch(e) {}
      });
      // Add non-canvas content
      var clone = body.cloneNode(true);
      // Remove elements hidden by accreditation view (data-acr="hide" with display:none)
      clone.querySelectorAll('[data-acr="hide"]').forEach(function(el) {
        if (el.style.display === 'none') el.remove();
      });
      clone.querySelectorAll('canvas').forEach(function(c){ c.remove(); });
      if (clone.innerHTML.trim()) content += clone.innerHTML;
    }

    if (content.trim()) {
      html += '<div style="margin-bottom:14px;"><strong style="display:block;font-size:13px;margin-bottom:6px;color:#1e293b;">' + titleText + '</strong>' + content + '</div>';
    }
  });

  if (!html) {
    alert('No sections are expanded. Expand at least one section before adding to report.');
    return false;
  }

  var state = captureToolState();

  if (window.parent && window.parent.addToReport) {
    var file = (window.parent.getCurrentToolFile && window.parent.getCurrentToolFile()) || (window.parent._currentToolFile) || '';
    window.parent.addToReport({ tool: toolName, analyte: analyte || toolName, html: html, file: file, state: state });
  }
  return true;
}

// Flash feedback on the add-to-report button after a successful add.
function rptBtnFeedback(btnId) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  var orig = btn.textContent;
  var origBg = btn.style.background;
  btn.textContent = '✓ Added!';
  btn.style.background = '#15803d';
  btn.style.borderColor = '#15803d';
  setTimeout(function() {
    btn.textContent = orig;
    btn.style.background = origBg;
    btn.style.borderColor = '';
  }, 1800);
}
