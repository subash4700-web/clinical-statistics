// linear_regression.js

// ── Math utilities ────────────────────────────────────────────

function _lgamma(z) {
  const p = [0.99999999999980993,676.5203681218851,-1259.1392167224028,
    771.32342877765313,-176.61502916214059,12.507343278686905,
    -0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - _lgamma(1 - z);
  z -= 1;
  let a = p[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += p[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

function _betaCF(a, b, x) {
  const MAX = 200, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAX; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function _regIncBeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbeta = _lgamma(a) + _lgamma(b) - _lgamma(a + b);
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta);
  if (x < (a + 1) / (a + b + 2)) return bt * _betaCF(a, b, x) / a;
  return 1 - bt * _betaCF(b, a, 1 - x) / b;
}

// Two-sided p-value for t-distribution
function tPVal(t, df) {
  if (!isFinite(t)) return 0;
  return _regIncBeta(df / 2, 0.5, df / (df + t * t));
}

// t critical value (two-sided) via binary search
function tCrit(alpha, df) {
  let lo = 0, hi = 20;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tPVal(mid, df) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Data parsing ──────────────────────────────────────────────

function parseCol(text) {
  return text.split(/[\n,;\t ]+/)
    .map(s => s.trim())
    .filter(s => s !== '' && !isNaN(s) && s !== '.')
    .map(Number);
}

// ── Descriptive ───────────────────────────────────────────────

function _mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function _std(arr) {
  const m = _mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

// ── Correlation ───────────────────────────────────────────────

function pearsonR(x, y) {
  const mx = _mean(x), my = _mean(y);
  let num = 0, sx = 0, sy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; sx += dx * dx; sy += dy * dy;
  }
  if (sx === 0 || sy === 0) return 0;
  return num / Math.sqrt(sx * sy);
}

function _rank(arr) {
  const n = arr.length;
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const r = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && sorted[j + 1].v === sorted[j].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[sorted[k].i] = avg;
    i = j + 1;
  }
  return r;
}

function spearmanR(x, y) { return pearsonR(_rank(x), _rank(y)); }

function fisherCI(r, n, alpha) {
  if (n < 4) return [null, null];
  const z = Math.atanh(r), se = 1 / Math.sqrt(n - 3);
  const zc = alpha <= 0.01 ? 2.576 : 1.960;
  return [Math.tanh(z - zc * se), Math.tanh(z + zc * se)];
}

// ── Simple linear regression ──────────────────────────────────

function linReg(x, y) {
  const n = x.length, mx = _mean(x), my = _mean(y);
  let Sxx = 0, Sxy = 0, Syy = 0;
  for (let i = 0; i < n; i++) {
    Sxx += (x[i] - mx) ** 2;
    Sxy += (x[i] - mx) * (y[i] - my);
    Syy += (y[i] - my) ** 2;
  }
  const b = Sxy / Sxx, a = my - b * mx;
  const r2 = (Sxy * Sxy) / (Sxx * Syy);
  const adjR2 = 1 - (1 - r2) * (n - 1) / (n - 2);
  const yHat = x.map(xi => a + b * xi);
  const resid = y.map((yi, i) => yi - yHat[i]);
  const SSres = resid.reduce((s, e) => s + e * e, 0);
  const rmse = Math.sqrt(SSres / (n - 2));
  const SE_b = rmse / Math.sqrt(Sxx);
  const SE_a = rmse * Math.sqrt(1 / n + mx * mx / Sxx);
  const t_b = b / SE_b, t_a = a / SE_a;
  return { a, b, r2, adjR2, rmse, SE_a, SE_b, t_a, t_b,
           p_a: tPVal(t_a, n-2), p_b: tPVal(t_b, n-2),
           yHat, resid, Sxx, mx, n };
}

function regBand(x0, reg, tc) {
  const se = reg.rmse * Math.sqrt(1 / reg.n + (x0 - reg.mx) ** 2 / reg.Sxx);
  const yh = reg.a + reg.b * x0;
  return [yh - tc * se, yh + tc * se];
}

// ── Formatting ────────────────────────────────────────────────

function _f(x, d = 4) { return Number.isFinite(x) ? x.toFixed(d) : '–'; }
function _fp(p) {
  if (!Number.isFinite(p)) return '–';
  return p < 0.001 ? '< 0.001' : p.toFixed(3);
}
function pBadge(p, a) {
  const sig = p < a;
  return `<span style="padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;
    background:${sig?'#dcfce7':'#fef3c7'};color:${sig?'#166534':'#92400e'};">${_fp(p)}</span>`;
}
function strength(r) {
  const a = Math.abs(r), dir = r < 0 ? 'Negative ' : 'Positive ';
  let s, c;
  if (a < 0.1)      { s='negligible'; c='#9CA3AF'; }
  else if (a < 0.3) { s='weak';       c='#D97706'; }
  else if (a < 0.5) { s='moderate';   c='#2563EB'; }
  else if (a < 0.7) { s='strong';     c='#059669'; }
  else              { s='very strong'; c='#059669'; }
  return `<span style="font-weight:700;color:${c};">${dir}${s}</span>`;
}

// ── Sample data generator ─────────────────────────────────────

function generateSample() {
  const n   = Math.max(5, parseInt(document.getElementById('genN').value) || 30);
  const rho = Math.min(0.999, Math.max(-0.999, parseFloat(document.getElementById('genR').value) || 0.7));
  const xMu = parseFloat(document.getElementById('genXMean').value) || 10;
  const xSd = Math.max(0.01, parseFloat(document.getElementById('genXSD').value) || 3);
  const randn = () => {
    let u; do { u = Math.random(); } while (u === 0);
    return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*Math.random());
  };
  const xs = Array.from({ length: n }, () => xMu + xSd * randn());
  const ys = xs.map(xi => rho*(xi-xMu)/xSd + Math.sqrt(1-rho*rho)*randn());
  document.getElementById('genOutX').value = xs.map(v => v.toFixed(3)).join('\n');
  document.getElementById('genOutY').value = ys.map(v => v.toFixed(3)).join('\n');
  document.getElementById('useGeneratedBtn').style.display = 'inline-block';
}

// ── Discrimination / diagnostic classification ─────────────────

function computeConfusion(x, y, threshX, threshY) {
  let TP = 0, TN = 0, FP = 0, FN = 0;
  for (let i = 0; i < x.length; i++) {
    const posX = x[i] >= threshX;
    const posY = y[i] >= threshY;
    if ( posX &&  posY) TP++;
    if (!posX && !posY) TN++;
    if (!posX &&  posY) FP++;
    if ( posX && !posY) FN++;
  }
  const n    = x.length;
  const sens = (TP + FN) > 0 ? TP / (TP + FN) * 100 : null;
  const spec = (TN + FP) > 0 ? TN / (TN + FP) * 100 : null;
  const ppv  = (TP + FP) > 0 ? TP / (TP + FP) * 100 : null;
  const npv  = (TN + FN) > 0 ? TN / (TN + FN) * 100 : null;
  const acc  = (TP + TN) / n * 100;
  const lrp  = (sens !== null && spec !== null && spec < 100) ? (sens / (100 - spec)) : null;
  const lrn  = (sens !== null && spec !== null && sens < 100) ? ((100 - sens) / spec) : null;
  return { TP, TN, FP, FN, n, sens, spec, ppv, npv, acc, lrp, lrn };
}

function diagHtml(c, xLbl, yLbl, threshX, threshY) {
  const pct = v => v !== null ? v.toFixed(1) + '%' : '—';
  const num = v => v !== null ? v.toFixed(3) : '—';
  return `
    <div class="card" style="margin-top:14px;">
      <div class="section-title">Diagnostic Classification
        <span style="font-weight:400;font-size:12px;color:var(--muted);margin-left:8px;">
          ${xLbl} ≥ ${threshX} &amp; ${yLbl} ≥ ${threshY} = positive
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <!-- Confusion matrix -->
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px;">Confusion Matrix</div>
          <table style="font-size:13px;">
            <thead>
              <tr>
                <th></th>
                <th class="num">${yLbl} ≥ ${threshY}</th>
                <th class="num">${yLbl} &lt; ${threshY}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${xLbl} ≥ ${threshX}</strong></td>
                <td class="num" style="color:#15803d;font-weight:700;">TP = ${c.TP}</td>
                <td class="num" style="color:#b91c1c;font-weight:700;">FN = ${c.FN}</td>
              </tr>
              <tr>
                <td><strong>${xLbl} &lt; ${threshX}</strong></td>
                <td class="num" style="color:#b91c1c;font-weight:700;">FP = ${c.FP}</td>
                <td class="num" style="color:#15803d;font-weight:700;">TN = ${c.TN}</td>
              </tr>
            </tbody>
          </table>
          <p class="note" style="margin-top:6px;">n = ${c.n} &nbsp;·&nbsp; Accuracy = ${pct(c.acc)}</p>
        </div>

        <!-- Metrics -->
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px;">Diagnostic Metrics</div>
          <table style="font-size:13px;">
            <tbody>
              <tr><td><strong>Sensitivity (TPR)</strong></td><td class="num">${pct(c.sens)}</td></tr>
              <tr><td><strong>Specificity (TNR)</strong></td><td class="num">${pct(c.spec)}</td></tr>
              <tr><td><strong>PPV</strong></td><td class="num">${pct(c.ppv)}</td></tr>
              <tr><td><strong>NPV</strong></td><td class="num">${pct(c.npv)}</td></tr>
              <tr><td><strong>LR+</strong></td><td class="num">${num(c.lrp)}</td></tr>
              <tr><td><strong>LR−</strong></td><td class="num">${num(c.lrn)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ── Charts ────────────────────────────────────────────────────

let _c1 = null, _c2 = null;

// ── Outlier exclusion state ───────────────────────────────────

let _lrRows  = [];
let _lrAlpha = 0.05, _lrXLbl = 'X', _lrYLbl = 'Y';

function _lrToggle(idx) {
  _lrRows[idx].include = !_lrRows[idx].include;
  const inc = _lrRows.filter(r => r.include);
  if (inc.length >= 3) _renderLR(inc.map(r => r.x), inc.map(r => r.y));
}

function _renderLRDataTable(x, y, reg) {
  const n   = x.length; // included rows
  const MSE = reg.rmse * reg.rmse;
  const p   = 2;        // intercept + slope
  const ct  = 4 / n;   // Cook's D threshold
  const ht  = 4 / n;   // leverage threshold (2p/n, p=2)

  // Map included _lrRows indices
  const incIdx = [];
  _lrRows.forEach((row, i) => { if (row.include) incIdx.push(i); });

  // Compute Cook's D + leverage per included row, store back on _lrRows
  incIdx.forEach((rowI, j) => {
    const hii   = 1/n + (x[j] - reg.mx) ** 2 / reg.Sxx;
    const denom = Math.max(1e-12, (1 - hii) ** 2);
    const cookD = MSE > 0 ? (reg.resid[j] ** 2 / (p * MSE)) * (hii / denom) : 0;
    _lrRows[rowI].hii   = hii;
    _lrRows[rowI].cookD = cookD;
    _lrRows[rowI].resid = reg.resid[j];
  });
  // Clear metrics for excluded rows
  _lrRows.forEach(row => {
    if (!row.include) { row.hii = null; row.cookD = null; row.resid = null; }
  });

  const nFlagged = _lrRows.filter(row => row.include && (row.cookD > ct || row.hii > ht)).length;
  const nExcl    = _lrRows.filter(row => !row.include).length;

  const rowsHtml = _lrRows.map((row, i) => {
    const excl  = !row.include;
    const flagC = row.include && row.cookD !== null && row.cookD > ct;
    const flagH = row.include && row.hii   !== null && row.hii   > ht;
    const flag  = flagC || flagH;
    const bg    = excl ? 'opacity:.4;' : flag ? 'background:#fef2f2;' : '';
    return `<tr style="${bg}">
      <td><input type="checkbox" ${row.include ? 'checked' : ''} onchange="_lrToggle(${i})"></td>
      <td class="num">${i + 1}</td>
      <td class="num">${_f(row.x, 4)}</td>
      <td class="num">${_f(row.y, 4)}</td>
      <td class="num">${row.resid !== null ? _f(row.resid, 4) : '—'}</td>
      <td class="num" ${flagC ? 'style="color:#b91c1c;font-weight:700;"' : ''}>
        ${row.cookD !== null ? row.cookD.toFixed(4) : '—'}${flagC ? ' ▲' : ''}
      </td>
      <td class="num" ${flagH ? 'style="color:#b91c1c;font-weight:700;"' : ''}>
        ${row.hii !== null ? row.hii.toFixed(4) : '—'}${flagH ? ' ▲' : ''}
      </td>
      <td>${flag ? '<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;background:#fee2e2;color:#991b1b;">outlier</span>' : ''}</td>
    </tr>`;
  }).join('');

  document.getElementById('lrDataTable').innerHTML = `
    <details class="card" style="margin-top:14px;" ${nFlagged > 0 ? 'open' : ''}>
      <summary style="cursor:pointer;font-weight:700;font-size:14px;user-select:none;display:flex;align-items:center;gap:8px;">
        Data review &amp; outlier exclusion
        ${nFlagged > 0 ? `<span style="font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;">${nFlagged} flagged</span>` : ''}
        ${nExcl    > 0 ? `<span style="font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#374151;">${nExcl} excluded</span>` : ''}
      </summary>
      <div style="overflow-x:auto;margin-top:10px;">
        <p class="note" style="margin-bottom:8px;">
          Uncheck a row to exclude it from the analysis.
          Flagged ▲ when Cook's D &gt; ${ct.toFixed(3)} or leverage &gt; ${ht.toFixed(3)}.
        </p>
        <table>
          <thead><tr>
            <th></th>
            <th class="num">#</th>
            <th class="num">${_lrXLbl}</th>
            <th class="num">${_lrYLbl}</th>
            <th class="num">Residual</th>
            <th class="num">Cook's D</th>
            <th class="num">Leverage</th>
            <th></th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </details>`;
}

function _renderLR(x, y) {
  const alpha = _lrAlpha;
  const xLbl  = _lrXLbl;
  const yLbl  = _lrYLbl;
  const nExcl = _lrRows.filter(row => !row.include).length;

  const n     = x.length;
  const r     = pearsonR(x, y);
  const rho   = spearmanR(x, y);
  const t_r   = r   * Math.sqrt(n-2) / Math.sqrt(Math.max(1e-15, 1 - r*r));
  const t_rho = rho * Math.sqrt(n-2) / Math.sqrt(Math.max(1e-15, 1 - rho*rho));
  const p_r   = tPVal(t_r, n-2);
  const p_rho = tPVal(t_rho, n-2);
  const ci_r  = fisherCI(r, n, alpha);
  const reg   = linReg(x, y);
  const tc    = tCrit(alpha, n-2);
  const ci_b  = [reg.b - tc*reg.SE_b, reg.b + tc*reg.SE_b];
  const ci_a  = [reg.a - tc*reg.SE_a, reg.a + tc*reg.SE_a];
  const pct   = Math.round((1-alpha)*100);

  document.getElementById('resultsContent').innerHTML = `
    ${nExcl > 0 ? `<div style="border-radius:12px;padding:10px 12px;border:1px solid #fbbf2455;background:#fffbeb;color:#92400e;font-size:13px;margin-bottom:10px;">
      Analysis based on <strong>${n}</strong> of <strong>${_lrRows.length}</strong> pairs — ${nExcl} excluded.
    </div>` : ''}
    <div class="card">
      <div class="section-title">Descriptive statistics</div>
      <table>
        <thead><tr>
          <th>Variable</th><th class="num">n</th>
          <th class="num">Mean</th><th class="num">SD</th>
          <th class="num">Min</th><th class="num">Max</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><strong>${xLbl}</strong></td><td class="num">${n}</td>
            <td class="num">${_f(_mean(x),3)}</td><td class="num">${_f(_std(x),3)}</td>
            <td class="num">${_f(Math.min(...x),3)}</td><td class="num">${_f(Math.max(...x),3)}</td>
          </tr>
          <tr>
            <td><strong>${yLbl}</strong></td><td class="num">${n}</td>
            <td class="num">${_f(_mean(y),3)}</td><td class="num">${_f(_std(y),3)}</td>
            <td class="num">${_f(Math.min(...y),3)}</td><td class="num">${_f(Math.max(...y),3)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="section-title">Correlation</div>
      <table>
        <thead><tr>
          <th>Method</th><th class="num">Coefficient</th>
          <th class="num">t</th><th class="num">df</th>
          <th class="num">p-value</th><th class="num">${pct}% CI</th>
          <th>Strength</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><strong>Pearson r</strong></td>
            <td class="num">${_f(r,4)}</td><td class="num">${_f(t_r,3)}</td>
            <td class="num">${n-2}</td><td class="num">${pBadge(p_r,alpha)}</td>
            <td class="num">${ci_r[0]!==null?`[${_f(ci_r[0],3)}, ${_f(ci_r[1],3)}]`:'–'}</td>
            <td>${strength(r)}</td>
          </tr>
          <tr>
            <td><strong>Spearman ρ</strong></td>
            <td class="num">${_f(rho,4)}</td><td class="num">${_f(t_rho,3)}</td>
            <td class="num">${n-2}</td><td class="num">${pBadge(p_rho,alpha)}</td>
            <td class="num">–</td>
            <td>${strength(rho)}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">Pearson CI via Fisher z-transformation. Spearman approximation reliable for n ≥ 10.</p>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="section-title">Simple linear regression</div>
      <div class="eqbox">ŷ = ${_f(reg.a,4)} + ${_f(reg.b,4)} &middot; ${xLbl}</div>
      <table>
        <thead><tr>
          <th>Parameter</th><th class="num">Estimate</th>
          <th class="num">SE</th><th class="num">t</th>
          <th class="num">p-value</th><th class="num">${pct}% CI</th>
        </tr></thead>
        <tbody>
          <tr>
            <td><strong>Intercept (a)</strong></td>
            <td class="num">${_f(reg.a,4)}</td><td class="num">${_f(reg.SE_a,4)}</td>
            <td class="num">${_f(reg.t_a,3)}</td><td class="num">${pBadge(reg.p_a,alpha)}</td>
            <td class="num">[${_f(ci_a[0],3)}, ${_f(ci_a[1],3)}]</td>
          </tr>
          <tr>
            <td><strong>Slope (b)</strong></td>
            <td class="num">${_f(reg.b,4)}</td><td class="num">${_f(reg.SE_b,4)}</td>
            <td class="num">${_f(reg.t_b,3)}</td><td class="num">${pBadge(reg.p_b,alpha)}</td>
            <td class="num">[${_f(ci_b[0],3)}, ${_f(ci_b[1],3)}]</td>
          </tr>
        </tbody>
      </table>
      <div class="stat-grid">
        <div class="stat-box"><div class="stat-val">${_f(reg.r2,4)}</div><div class="stat-lbl">R²</div></div>
        <div class="stat-box"><div class="stat-val">${_f(reg.adjR2,4)}</div><div class="stat-lbl">Adjusted R²</div></div>
        <div class="stat-box"><div class="stat-val">${_f(reg.rmse,4)}</div><div class="stat-lbl">RMSE</div></div>
        <div class="stat-box"><div class="stat-val">${n-2}</div><div class="stat-lbl">df (residual)</div></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:14px;">
      <div class="card">
        <div class="section-title">Scatterplot &amp; regression line</div>
        <canvas id="scatterChart"></canvas>
      </div>
      <div class="card" id="residCard">
        <div class="section-title">Residual plot</div>
        <canvas id="residChart"></canvas>
      </div>
    </div>
    <div id="diagSection"></div>
    <div id="lrDataTable"></div>
  `;

  // Threshold / diagnostic classification
  const showThresh = document.getElementById('showThresh').checked;
  const threshX = showThresh ? parseFloat(document.getElementById('threshX').value) : NaN;
  const threshY = showThresh ? parseFloat(document.getElementById('threshY').value) : NaN;
  const hasThresh = showThresh && !isNaN(threshX) && !isNaN(threshY);

  drawScatter(x, y, reg, xLbl, yLbl, alpha, hasThresh ? threshX : null, hasThresh ? threshY : null);
  drawResiduals(reg);

  if (hasThresh) {
    const conf = computeConfusion(x, y, threshX, threshY);
    document.getElementById('diagSection').innerHTML = diagHtml(conf, xLbl, yLbl, threshX, threshY);
  }

  _renderLRDataTable(x, y, reg);
}

function drawScatter(x, y, reg, xLbl, yLbl, alpha, threshX, threshY) {
  const ctx = document.getElementById('scatterChart').getContext('2d');
  if (_c1) { _c1.destroy(); _c1 = null; }
  const tc   = tCrit(alpha, reg.n - 2);
  const xMin = Math.min(...x), xMax = Math.max(...x);
  const yMin = Math.min(...y), yMax = Math.max(...y);
  const pad  = (xMax - xMin) * 0.06;
  const padY = (yMax - yMin) * 0.06;
  const nPts = 80;
  const linX = Array.from({ length: nPts }, (_, i) =>
    xMin - pad + (xMax - xMin + 2*pad) * i / (nPts-1));
  const showCI = document.getElementById('showCI').checked;

  // Colour points by quadrant if threshold is set
  const hasThresh = threshX !== null && threshY !== null;
  const ptColors = hasThresh ? x.map((xi, i) => {
    const posX = xi >= threshX, posY = y[i] >= threshY;
    if ( posX &&  posY) return 'rgba(21,128,61,0.75)';   // TP green
    if (!posX && !posY) return 'rgba(37,99,235,0.6)';    // TN blue
    if (!posX &&  posY) return 'rgba(220,38,38,0.75)';   // FP red
    return 'rgba(245,158,11,0.85)';                       // FN amber
  }) : x.map(() => 'rgba(25,118,210,0.6)');

  const datasets = [
    {
      label: 'Observed',
      data: x.map((xi, i) => ({ x: xi, y: y[i] })),
      backgroundColor: ptColors,
      pointRadius: 5, pointHoverRadius: 7,
    },
    {
      label: `ŷ = ${_f(reg.a,3)} + ${_f(reg.b,3)}·${xLbl}`,
      data: linX.map(xi => ({ x: xi, y: reg.a + reg.b*xi })),
      type: 'line',
      borderColor: '#ef4444', borderWidth: 2,
      pointRadius: 0, fill: false, tension: 0,
    }
  ];

  if (showCI) {
    datasets.push({
      label: `${Math.round((1-alpha)*100)}% CI`,
      data: linX.map(xi => ({ x: xi, y: regBand(xi, reg, tc)[1] })),
      type: 'line',
      borderColor: 'rgba(239,68,68,0.35)', borderWidth: 1,
      borderDash: [5,4], pointRadius: 0, fill: '+1',
      backgroundColor: 'rgba(239,68,68,0.08)', tension: 0,
    }, {
      label: '_cilower',
      data: linX.map(xi => ({ x: xi, y: regBand(xi, reg, tc)[0] })),
      type: 'line',
      borderColor: 'rgba(239,68,68,0.35)', borderWidth: 1,
      borderDash: [5,4], pointRadius: 0, fill: false, tension: 0,
    });
  }

  // Threshold lines
  if (hasThresh) {
    datasets.push({
      label: `${xLbl} threshold = ${threshX}`,
      data: [{ x: threshX, y: yMin - padY }, { x: threshX, y: yMax + padY }],
      type: 'line', borderColor: '#e67e22', borderWidth: 2,
      borderDash: [6,4], pointRadius: 0, fill: false, tension: 0,
    }, {
      label: `${yLbl} threshold = ${threshY}`,
      data: [{ x: xMin - pad, y: threshY }, { x: xMax + pad, y: threshY }],
      type: 'line', borderColor: '#27ae60', borderWidth: 2,
      borderDash: [6,4], pointRadius: 0, fill: false, tension: 0,
    });
  }

  _c1 = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true, position: 'bottom',
          labels: { font:{size:11}, filter: item => !item.text.startsWith('_') }
        }
      },
      scales: {
        x: { type: 'linear', title: { display: true, text: xLbl } },
        y: { title: { display: true, text: yLbl } }
      }
    }
  });
}

function drawResiduals(reg) {
  const residCard = document.getElementById('residCard');
  if (!document.getElementById('showResid').checked) {
    residCard.style.display = 'none'; return;
  }
  residCard.style.display = 'block';
  const ctx = document.getElementById('residChart').getContext('2d');
  if (_c2) { _c2.destroy(); _c2 = null; }
  const fMin = Math.min(...reg.yHat), fMax = Math.max(...reg.yHat);
  _c2 = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Residuals',
          data: reg.yHat.map((f, i) => ({ x: f, y: reg.resid[i] })),
          backgroundColor: 'rgba(16,185,129,0.6)', pointRadius: 5,
        },
        {
          label: 'Zero line',
          data: [{ x: fMin, y: 0 }, { x: fMax, y: 0 }],
          type: 'line',
          borderColor: '#9CA3AF', borderDash: [5,5], borderWidth: 1.5,
          pointRadius: 0, fill: false, tension: 0,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true, position: 'bottom', labels: { font:{size:11} } } },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'Fitted values' } },
        y: { title: { display: true, text: 'Residuals' } }
      }
    }
  });
}

// ── Main ──────────────────────────────────────────────────────

function runAnalysis() {
  const xAll  = parseCol(document.getElementById('xData').value);
  const yAll  = parseCol(document.getElementById('yData').value);
  const errEl = document.getElementById('inputError');
  errEl.style.display = 'none';

  if (xAll.length < 3 || yAll.length < 3) {
    errEl.textContent = 'At least 3 data pairs are required.';
    errEl.style.display = 'block'; return;
  }
  if (xAll.length !== yAll.length) {
    errEl.textContent = `X has ${xAll.length} values but Y has ${yAll.length} — they must match.`;
    errEl.style.display = 'block'; return;
  }

  _lrAlpha = parseFloat(document.getElementById('alpha').value);
  _lrXLbl  = document.getElementById('xLabel').value.trim() || 'X';
  _lrYLbl  = document.getElementById('yLabel').value.trim() || 'Y';
  _lrRows  = xAll.map((xi, i) => ({ x: xi, y: yAll[i], include: true }));
  _renderLR(xAll, yAll);
}

console.log('linear_regression.js loaded');
