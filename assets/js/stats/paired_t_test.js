/* =========================================================
   Paired t-test with Q–Q plot and Q–Q table (SAFE VERSION)
   ========================================================= */

function runPairedTTest() {
  const input = document.getElementById("dataInput").value.trim();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!input) {
    resultsDiv.innerHTML = "<p>Please enter paired data.</p>";
    return;
  }

  /* -------- Parse paired data -------- */
  const rows = input.split(/\n+/);
  const diffs = [];

  for (const row of rows) {
    const vals = row.trim().split(/[\s,;]+/).map(Number);
    if (vals.length !== 2 || vals.some(isNaN)) {
      resultsDiv.innerHTML =
        "<p>Each row must contain exactly two numeric values.</p>";
      return;
    }
    diffs.push(vals[1] - vals[0]);
  }

  const n = diffs.length;
  if (n < 2) {
    resultsDiv.innerHTML =
      "<p>At least two paired observations are required.</p>";
    return;
  }

  /* -------- Core statistics -------- */
  const mean = diffs.reduce((a, b) => a + b, 0) / n;

  const sd = Math.sqrt(
    diffs.reduce((s, d) => s + (d - mean) ** 2, 0) / (n - 1)
  );

  const t = mean / (sd / Math.sqrt(n));
  const df = n - 1;
  const p = 2 * (1 - normalCDF(Math.abs(t)));

  resultsDiv.innerHTML += `
    <h3>Results</h3>
    <p><strong>n:</strong> ${n}</p>
    <p><strong>Mean difference:</strong> ${mean.toFixed(4)}</p>
    <p><strong>SD of differences:</strong> ${sd.toFixed(4)}</p>
    <p><strong>t(${df}):</strong> ${t.toFixed(4)}</p>
    <p><strong>Approx. p-value:</strong> ${p.toFixed(6)}</p>
  `;

  /* -------- Effect size -------- */
  const d = mean / sd;
  resultsDiv.innerHTML += `
    <h4>Effect size</h4>
    <p>Cohen’s d<sub>p</sub>: ${d.toFixed(4)}</p>
  `;

  /* -------- Q–Q plot + table -------- */
  addQQSection(diffs);
}

/* =========================================================
   Q–Q plot + table
   ========================================================= */

function addQQSection(data) {
  const resultsDiv = document.getElementById("results");

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(
    sorted.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)
  );

  const probs = sorted.map((_, i) => (i + 0.5) / n);
  const theo = probs.map(p => inverseNormal(p));
  const z = sorted.map(x => (x - mean) / sd);

  /* -------- Title -------- */
  const title = document.createElement("h4");
  title.textContent = "Normal Q–Q plot";
  resultsDiv.appendChild(title);

  /* -------- Canvas (SAFE DOM CREATION) -------- */
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 320;
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";
  canvas.style.marginTop = "12px";

  resultsDiv.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  drawQQPlot(ctx, theo, z);

  /* -------- Table -------- */
  let tableHTML = `
    <h4>Data analysis (Q–Q table)</h4>
    <table class="qq-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Sorted diff</th>
          <th>p</th>
          <th>Theoretical quantile</th>
          <th>Standardized value</th>
        </tr>
      </thead>
      <tbody>
  `;

  sorted.forEach((v, i) => {
    tableHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${v.toFixed(4)}</td>
        <td>${probs[i].toFixed(4)}</td>
        <td>${theo[i].toFixed(4)}</td>
        <td>${z[i].toFixed(4)}</td>
      </tr>
    `;
  });

  tableHTML += "</tbody></table>";
  resultsDiv.insertAdjacentHTML("beforeend", tableHTML);
}

/* =========================================================
   Plot drawing
   ========================================================= */

function drawQQPlot(ctx, x, y) {
  const pad = 40;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const xmin = Math.min(...x);
  const xmax = Math.max(...x);
  const ymin = Math.min(...y);
  const ymax = Math.max(...y);

  const sx = v => pad + (v - xmin) / (xmax - xmin) * (w - 2 * pad);
  const sy = v => h - pad - (v - ymin) / (ymax - ymin) * (h - 2 * pad);

  ctx.clearRect(0, 0, w, h);

  /* Reference line */
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = "#dc2626";
  ctx.beginPath();
  ctx.moveTo(sx(xmin), sy(xmin));
  ctx.lineTo(sx(xmax), sy(xmax));
  ctx.stroke();
  ctx.setLineDash([]);

  /* Points */
  ctx.fillStyle = "#2563eb";
  for (let i = 0; i < x.length; i++) {
    ctx.beginPath();
    ctx.arc(sx(x[i]), sy(y[i]), 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/* =========================================================
   Math helpers
   ========================================================= */

function normalCDF(x) {
  return (1 + erf(x / Math.sqrt(2))) / 2;
}

function erf(x) {
  const sign = Math.sign(x);
  x = Math.abs(x);

  const a1 = 0.254829592,
        a2 = -0.284496736,
        a3 = 1.421413741,
        a4 = -1.453152027,
        a5 = 1.061405429,
        p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x));

  return sign * y;
}

function inverseNormal(p) {
  // Acklam approximation
  const a = [-39.696830, 220.946098, -275.928510, 138.357751, -30.664798, 2.506628];
  const b = [-54.476098, 161.585836, -155.698979, 66.801311, -13.280681];
  const c = [-0.007784894, -0.322396, -2.400758, -2.549732, 4.374664, 2.938163];
  const d = [0.007784695, 0.322467, 2.445134, 3.754408];

  let q, r;
  if (p < 0.02425) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
  if (p > 0.97575) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
             ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
  q = p - 0.5;
  r = q * q;
  return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5]) * q /
         (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
}

console.log("paired_t_test.js fully loaded (QQ plot + table)");
