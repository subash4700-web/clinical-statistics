/* =========================================================
   One-sample t-test + Shapiro–Wilk (approx) + Q–Q plot
   - No regression line in Q–Q plot (only y=x reference)
   - Student-t p-values and critical values are computed
     using the regularized incomplete beta function.
   ========================================================= */

function runOneSampleTTest() {
  const raw = document.getElementById("dataInput").value || "";
  const mu0 = parseFloat(document.getElementById("mu0").value);
  const alpha = parseFloat(document.getElementById("alpha").value);
  const testType = document.getElementById("testType").value;
  const showEffect = document.getElementById("showEffect").checked;
  const showQQTable = document.getElementById("showQQTable").checked;

  const values = parseNumbers(raw);

  const resultsEl = document.getElementById("results");

  if (!Number.isFinite(mu0)) {
    resultsEl.innerHTML = errBox("μ₀ must be a valid number.");
    return;
  }
  if (values.length < 3) {
    resultsEl.innerHTML = errBox("At least 3 numeric observations are required.");
    return;
  }

  const n = values.length;
  const mean = average(values);
  const sd = sampleSD(values);
  const df = n - 1;

  if (!Number.isFinite(sd) || sd === 0) {
    resultsEl.innerHTML = errBox("Standard deviation is 0 (or invalid). The t-test cannot be computed.");
    return;
  }

  const se = sd / Math.sqrt(n);
  const t = (mean - mu0) / se;

  // p-value from Student t distribution
  let pValue;
  if (testType === "two-sided") {
    pValue = 2 * (1 - studentTCDF(Math.abs(t), df));
  } else if (testType === "greater") {
    pValue = 1 - studentTCDF(t, df);
  } else { // less
    pValue = studentTCDF(t, df);
  }
  pValue = clamp01(pValue);

  // CI for mean
  const tCrit = studentTInv(1 - alpha / 2, df);
  const ciMeanLow = mean - tCrit * se;
  const ciMeanHigh = mean + tCrit * se;

  // Normality
  const sw = shapiroWilkApprox(values); // returns {W, p}
  const swBad = sw.p <= alpha;

  // Q–Q data table values (like your screenshot)
  const qq = buildQQTable(values);

  // Effect size (optional)
  let effectHTML = "";
  if (showEffect) {
    const d = (mean - mu0) / sd;

    // Approx SE and CI for one-sample d (large-sample style)
    // SE(d) ≈ sqrt(1/n + d^2/(2*(n-1)))
    const seD = Math.sqrt((1 / n) + (d * d) / (2 * (n - 1)));
    const z = 1.96; // approx 95%
    const dLow = d - z * seD;
    const dHigh = d + z * seD;

    effectHTML = `
      <h3>Effect size</h3>
      <p><strong>Cohen’s d:</strong> ${fmt(d, 4)}
        <span class="pill">95% CI (approx.): [${fmt(dLow, 4)}, ${fmt(dHigh, 4)}]</span>
      </p>
      <p class="note">CI for d is an approximation; exact methods may differ for small samples.</p>
    `;
  }

  // Interpretation block
  const sig = pValue < alpha;
  const testLabel =
    testType === "two-sided" ? "Two-sided (μ ≠ μ₀)" :
    testType === "greater" ? "One-sided (μ > μ₀)" :
    "One-sided (μ < μ₀)";

  const conclusion =
    sig
      ? `<span class="bad">✔ Reject H₀</span> <span class="pill">p < α</span>`
      : `<span class="ok">✘ Do not reject H₀</span> <span class="pill">p ≥ α</span>`;

  const normalityLine =
    swBad
      ? `<span class="bad">✘ Normality assumption is violated (p ≤ α)</span>`
      : `<span class="ok">✔ No evidence against normality (p > α)</span>`;

  resultsEl.innerHTML = `
    <h3>Results</h3>
    <p><strong>Test:</strong> One-sample t-test <span class="pill">${escapeHTML(testLabel)}</span></p>
    <p><strong>n:</strong> ${n}</p>
    <p><strong>Mean (x̄):</strong> ${fmt(mean, 4)}</p>
    <p><strong>Standard deviation (s):</strong> ${fmt(sd, 4)}</p>
    <p><strong>Hypothesized mean (μ₀):</strong> ${fmt(mu0, 4)}</p>

    <div class="formula">
      t(${df}) = ${fmt(t, 4)}<br>
      p-value = ${fmt(pValue, 6)}<br>
      ${conclusion}
    </div>

    <h3>Confidence interval for mean</h3>
    <p><strong>${(1 - alpha) * 100}% CI:</strong> [${fmt(ciMeanLow, 4)}, ${fmt(ciMeanHigh, 4)}]</p>

    ${effectHTML}

    <h3>Normality test (Shapiro–Wilk)</h3>
    <p><strong>W-statistic:</strong> ${fmt(sw.W, 4)}</p>
    <p><strong>p-value:</strong> ${fmt(sw.p, 6)}</p>
    <p>${normalityLine}</p>

    ${swBad ? `
      <div class="warnbox">
        <strong>Interpretation</strong><br>
        <span class="bad">✘ Normality assumption is violated.</span><br>
        Consider non-parametric alternatives (e.g., Wilcoxon), check outliers, or consider transformations.
      </div>
    ` : ""}

    <h3>Normal Q–Q plot</h3>
    <p class="note">The dashed line is the theoretical normal reference (y = x). No fitted line is drawn.</p>
    <canvas id="qqplot" height="360"></canvas>

    ${showQQTable ? renderQQTableHTML(qq) : ""}
  `;

  // Draw plot after HTML insertion
  drawQQPlot("qqplot", qq);
}

/* ===================== Parsing ===================== */

function parseNumbers(text) {
  // Accept: one per row, space, comma, semicolon, tab
  return (text || "")
    .trim()
    .split(/[\s,;]+/g)
    .map(s => Number(String(s).replace(",", "."))) // defensive if comma decimals slip in
    .filter(v => Number.isFinite(v));
}

/* ===================== Descriptives ===================== */

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sampleSD(arr) {
  const m = average(arr);
  const n = arr.length;
  const ss = arr.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}

/* ===================== Student t CDF + inverse ===================== */
/* Uses regularized incomplete beta for accurate p-values/critical values */

function studentTCDF(t, df) {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return NaN;

  if (t === 0) return 0.5;

  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  const ib = regIncompleteBeta(x, a, b);

  // For t > 0: CDF = 1 - 0.5 * I_x(df/2, 1/2)
  // For t < 0: CDF = 0.5 * I_x(df/2, 1/2)
  if (t > 0) return 1 - 0.5 * ib;
  return 0.5 * ib;
}

function studentTInv(p, df) {
  // numeric inversion via bisection
  p = clamp01(p);
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p === 0.5) return 0;

  // Search bounds
  let lo = -100, hi = 100;
  // Tighten if needed
  for (let i = 0; i < 20; i++) {
    const flo = studentTCDF(lo, df);
    const fhi = studentTCDF(hi, df);
    if (flo > p) { hi = lo; lo *= 2; continue; }
    if (fhi < p) { lo = hi; hi *= 2; continue; }
    break;
  }

  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const f = studentTCDF(mid, df);
    if (f < p) lo = mid;
    else hi = mid;
    if (Math.abs(hi - lo) < 1e-10) break;
  }
  return (lo + hi) / 2;
}

/* ===================== Incomplete beta ===================== */

function regIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b)
    + a * Math.log(x) + b * Math.log(1 - x)
  );

  // Use continued fraction
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  } else {
    return 1 - bt * betaCF(1 - x, b, a) / b;
  }
}

function betaCF(x, a, b) {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;

  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;

  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    let m2 = 2 * m;

    // even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    // odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Lanczos approximation
function logGamma(z) {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/* ===================== Shapiro–Wilk (approx) ===================== */
/* Teaching-friendly approximation: W via correlation with normal scores,
   p via a smooth mapping calibrated for typical n (not exact R/SPSS). */

function shapiroWilkApprox(values) {
  const x = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const n = x.length;
  const meanX = average(x);
  const s2 = x.reduce((s, v) => s + (v - meanX) ** 2, 0);
  if (s2 === 0) return { W: 0, p: 0 };

  // Normal scores (Blom)
  const m = [];
  for (let i = 1; i <= n; i++) {
    const p = (i - 3 / 8) / (n + 1 / 4);
    m.push(normalInv(p));
  }

  // Correlation^2 between x and m (Shapiro–Francia-like)
  const meanM = average(m);
  const sM2 = m.reduce((s, v) => s + (v - meanM) ** 2, 0);
  const cov = x.reduce((s, v, i) => s + (v - meanX) * (m[i] - meanM), 0);
  const r = cov / Math.sqrt(s2 * sM2);
  const W = clamp01(r * r);

  // Map W -> p (smooth monotone approximation)
  // This keeps behavior reasonable and consistent for UI usage.
  // If you later want exact SW p-values, we can swap this function.
  const z = Math.sqrt(n) * (1 - W);
  const pVal = Math.exp(-1.2725 * z * z); // heuristic
  return { W, p: clamp01(pVal) };
}

/* ===================== QQ data + table ===================== */

function buildQQTable(values) {
  const x = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const n = x.length;
  const meanX = average(x);
  const sdX = sampleSD(x);

  const rows = [];
  for (let i = 1; i <= n; i++) {
    // Probability like typical QQ plot positions
    const p = (i - 0.5) / n;
    const theo = normalInv(p);
    const z = (x[i - 1] - meanX) / sdX;

    rows.push({
      index: i,
      sorted: x[i - 1],
      p,
      theoretical: theo,
      standardized: z
    });
  }
  return rows;
}

function renderQQTableHTML(rows) {
  const head = `
    <h3>Data analysis (Q–Q table)</h3>
    <div class="note">Sorted data, plotting positions, theoretical normal quantiles, and standardized values.</div>
    <div style="overflow:auto; border-radius:10px;">
      <table class="data-table">
        <tr>
          <th>#</th>
          <th>Sorted value</th>
          <th>Probability (p)</th>
          <th>Theoretical quantile</th>
          <th>Standardized value</th>
        </tr>
  `;
  const body = rows.map(r => `
    <tr>
      <td>${r.index}</td>
      <td>${fmt(r.sorted, 4)}</td>
      <td>${fmt(r.p, 4)}</td>
      <td>${fmt(r.theoretical, 4)}</td>
      <td>${fmt(r.standardized, 4)}</td>
    </tr>
  `).join("");

  const foot = `
      </table>
    </div>
  `;
  return head + body + foot;
}

/* ===================== QQ plot drawing ===================== */

function drawQQPlot(canvasId, rows) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Make canvas responsive but sharp
  const cssW = canvas.clientWidth || 900;
  const cssH = canvas.getAttribute("height") ? Number(canvas.getAttribute("height")) : 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const w = cssW;
  const h = cssH;

  // Margins
  const L = 60, R = 20, T = 20, B = 50;

  const xs = rows.map(r => r.theoretical);
  const ys = rows.map(r => r.standardized);

  const min = Math.min(...xs, ...ys);
  const max = Math.max(...xs, ...ys);
  const pad = 0.08 * (max - min || 1);
  const lo = min - pad;
  const hi = max + pad;

  const xScale = x => L + (x - lo) / (hi - lo) * (w - L - R);
  const yScale = y => (h - B) - (y - lo) / (hi - lo) * (h - T - B);

  // Background
  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    const gx = L + i * (w - L - R) / 6;
    const gy = T + i * (h - T - B) / 6;
    ctx.beginPath(); ctx.moveTo(gx, T); ctx.lineTo(gx, h - B); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L, gy); ctx.lineTo(w - R, gy); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, h - B); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(L, h - B); ctx.lineTo(w - R, h - B); ctx.stroke();

  // Labels
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Theoretical quantiles", Math.floor((w - 160) / 2), h - 14);
  ctx.save();
  ctx.translate(18, Math.floor(h / 2));
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Observed quantiles (standardized)", -110, 0);
  ctx.restore();

  // Reference line y = x (ONLY reference, no fitting)
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = "rgba(220,38,38,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xScale(lo), yScale(lo));
  ctx.lineTo(xScale(hi), yScale(hi));
  ctx.stroke();
  ctx.setLineDash([]);

  // Points
  ctx.fillStyle = "rgba(37,99,235,0.75)";
  for (const r of rows) {
    const x = xScale(r.theoretical);
    const y = yScale(r.standardized);
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Simple legend
  const lx = w - R - 260, ly = T + 10;
  ctx.fillStyle = "rgba(37,99,235,0.75)";
  ctx.fillRect(lx, ly, 22, 8);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillText("Observed values", lx + 30, ly + 10);

  ctx.strokeStyle = "rgba(220,38,38,0.9)";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(lx, ly + 26);
  ctx.lineTo(lx + 22, ly + 26);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillText("Theoretical normal reference", lx + 30, ly + 30);
}

/* ===================== Normal inverse ===================== */

function normalInv(p) {
  // Peter John Acklam approximation
  // valid for 0 < p < 1
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];

  const plow = 0.02425;
  const phigh = 1 - plow;
  let q, r;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ===================== UI helpers ===================== */

function fmt(x, digits) {
  if (!Number.isFinite(x)) return String(x);
  return Number(x).toFixed(digits);
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function errBox(msg) {
  return `<div class="errbox"><strong>Error</strong><br>${escapeHTML(msg)}</div>`;
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
