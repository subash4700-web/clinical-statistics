document.addEventListener("DOMContentLoaded", () => {

  const runBtn = document.getElementById("runBtn");
  const resultsDiv = document.getElementById("results");

  runBtn.addEventListener("click", runMcNemar);

  function runMcNemar() {

    // Read inputs
    const a = Number(document.getElementById("a")?.value); // ignored
    const b = Number(document.getElementById("b")?.value);
    const c = Number(document.getElementById("c")?.value);
    const d = Number(document.getElementById("d")?.value); // ignored
    const alpha = Number(document.getElementById("alpha").value);

    // Validate b and c only
    if (!Number.isFinite(b) || !Number.isFinite(c) || b < 0 || c < 0) {
      showError("Invalid input values for b or c.");
      return;
    }

    if (b + c === 0) {
      showError("McNemar’s test cannot be computed when b + c = 0.");
      return;
    }

    const n = b + c;
    const df = 1;

    // --- McNemar statistics ---
    const chi2_uncorrected = Math.pow(b - c, 2) / n;
    const chi2_corrected = Math.pow(Math.abs(b - c) - 1, 2) / n;

    const p_uncorrected = chiSquareRightTail(chi2_uncorrected, df);
    const p_corrected = chiSquareRightTail(chi2_corrected, df);

    const chi2_crit = chiSquareCritical(alpha, df);

    // Decision based on corrected statistic (recommended)
    const rejectH0 = chi2_corrected > chi2_crit;

    // --- Effect size: Odds Ratio for discordant pairs ---
    const oddsRatio = c > 0 ? b / c : Infinity;
    const lnOR = c > 0 && b > 0 ? Math.log(b / c) : NaN;
    const seLnOR = (b > 0 && c > 0) ? Math.sqrt(1/b + 1/c) : NaN;
    const z95 = 1.96;
    const orCILo = isFinite(lnOR) ? Math.exp(lnOR - z95 * seLnOR) : NaN;
    const orCIHi = isFinite(lnOR) ? Math.exp(lnOR + z95 * seLnOR) : NaN;
    const orStr = isFinite(oddsRatio) ? oddsRatio.toFixed(2) : '∞';
    const orCIStr = (isFinite(orCILo) && isFinite(orCIHi)) ? `[${orCILo.toFixed(2)}, ${orCIHi.toFixed(2)}]` : '—';

    // Direction of shift
    const shiftDir = b > c ? 'Condition 1 → Condition 2' : b < c ? 'Condition 2 → Condition 1' : 'No directional shift';

    // --- Output ---
    resultsDiv.innerHTML = `
      <div class="results">
        <h3>McNemar Test Results</h3>

        <div class="section-title">Discordant Pairs</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">b (Yes → No)</div>
            <div style="font-size:20px;font-weight:800;color:#111827;">${b}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">c (No → Yes)</div>
            <div style="font-size:20px;font-weight:800;color:#111827;">${c}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;">
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Total discordant</div>
            <div style="font-size:20px;font-weight:800;color:#111827;">${n}</div>
          </div>
        </div>

        <div class="section-title">Test Statistics</div>
        <table>
          <thead><tr><th>Statistic</th><th>Value</th><th>p-value</th></tr></thead>
          <tbody>
            <tr><td>χ² (without correction)</td><td>${chi2_uncorrected.toFixed(3)}</td><td>${p_uncorrected < 0.001 ? '< 0.001' : p_uncorrected.toFixed(4)}</td></tr>
            <tr><td>χ² (with Yates' correction)</td><td>${chi2_corrected.toFixed(3)}</td><td>${p_corrected < 0.001 ? '< 0.001' : p_corrected.toFixed(4)}</td></tr>
            <tr><td>χ²<sub>crit</sub> (df=1, α=${alpha})</td><td>${chi2_crit}</td><td>—</td></tr>
          </tbody>
        </table>

        <div class="section-title">Effect Size</div>
        <table>
          <thead><tr><th>Measure</th><th>Value</th><th>95% CI</th></tr></thead>
          <tbody>
            <tr><td><strong>Odds Ratio (b/c)</strong></td><td>${orStr}</td><td>${orCIStr}</td></tr>
            <tr><td>Direction of shift</td><td colspan="2">${shiftDir} (${b > c ? b + ' vs ' + c : c + ' vs ' + b})</td></tr>
          </tbody>
        </table>
        <p style="font-size:12px;color:#6b7280;margin-top:4px;">Odds ratio = b/c. OR > 1 means more changes from Yes→No than No→Yes. OR = 1 means equal change in both directions. 95% CI excluding 1.0 indicates significant asymmetry.</p>

        <div class="section-title">Verdict</div>
        <div style="border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:13px;font-weight:700;${rejectH0 ? 'background:#fef2f2;border:1px solid #fca5a5;color:#991b1b;' : 'background:#f0fdf4;border:1px solid #86efac;color:#166534;'}">
          ${rejectH0
            ? `✗ Reject H₀ (p = ${p_corrected < 0.001 ? '< 0.001' : p_corrected.toFixed(4)}) — Significant systematic shift detected.<br>
               <span style="font-weight:400;">The change is predominantly <strong>${b > c ? 'Yes → No' : 'No → Yes'}</strong> (OR = ${orStr}, 95% CI ${orCIStr}).</span>`
            : `✓ Fail to reject H₀ (p = ${p_corrected < 0.001 ? '< 0.001' : p_corrected.toFixed(4)}) — No significant difference between paired proportions.<br>
               <span style="font-weight:400;">The discordant pairs are balanced (OR = ${orStr}, 95% CI ${orCIStr}).</span>`}
        </div>
      </div>
    `;

    if (typeof wrapSectionsForReport === 'function') wrapSectionsForReport('results');

    // Render heatmap after a brief delay to ensure canvas is ready
    setTimeout(() => {
      const labelBeforeYes = document.getElementById("labelBeforeYes")?.value || "Before: Yes";
      const labelBeforeNo = document.getElementById("labelBeforeNo")?.value || "Before: No";
      const labelAfterYes = document.getElementById("labelAfterYes")?.value || "After: Yes";
      const labelAfterNo = document.getElementById("labelAfterNo")?.value || "After: No";
      try {
        renderHeatmap(a, b, c, d, labelBeforeYes, labelBeforeNo, labelAfterYes, labelAfterNo, rejectH0);
      } catch (e) {
        console.warn("Heatmap rendering error:", e);
      }
    }, 50);
  }

  // -----------------------------
  // Helper functions
  // -----------------------------

  function showError(message) {
    resultsDiv.innerHTML = `
      <div class="results error">
        <h3>McNemar Test</h3>
        <p>${message}</p>
      </div>
    `;
  }

  // Right-tail chi-square probability
  function chiSquareRightTail(x, df) {
    if (df !== 1) return NaN;
    return 1 - erf(Math.sqrt(x / 2));
  }

  // Chi-square critical values (df = 1)
  function chiSquareCritical(alpha, df) {
    if (df !== 1) return null;
    if (alpha === 0.05) return 3.841;
    if (alpha === 0.01) return 6.635;
    return null;
  }

  function renderChi2Viz(canvasId, chi2Value, df, alpha, footerId){
    const c = document.getElementById(canvasId); if(!c) return;
    const ctx = c.getContext('2d'); const W = c.parentElement.clientWidth || 700; const H = 220; c.width=W; c.height=H; ctx.clearRect(0,0,W,H);
    const pad=40; const plotW=W-pad*2; const plotH=H-80;
    const xmin = 0; const xmax = Math.max(chi2Value*2, 8);
    const pdf = x => (1/ (Math.sqrt(2*Math.PI*x)) ) * Math.exp(-x/2); // approximate for df=1
    let yMax=0; for(let x=xmin+0.0001;x<=xmax;x+= (xmax-xmin)/400) yMax=Math.max(yMax, pdf(x));
    const toX=v => pad + (v - xmin)/(xmax - xmin)*plotW; const toY=v => 20 + plotH*(1 - v/yMax);
    // curve
    ctx.strokeStyle='#ef4444'; ctx.lineWidth=2; ctx.beginPath(); for(let i=0;i<=400;i++){ const x = xmin + i/400*(xmax-xmin); const y=toY(pdf(x)); i===0?ctx.moveTo(toX(x),y):ctx.lineTo(toX(x),y); } ctx.stroke();
    // observed
    const ox = toX(chi2Value); ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(ox, toY(pdf(chi2Value)),6,0,Math.PI*2); ctx.fill();
    // critical
    const crit = chiSquareCritical(alpha, df); if(crit){ const cx=toX(crit); ctx.setLineDash([6,4]); ctx.strokeStyle='#ca8a04'; ctx.beginPath(); ctx.moveTo(cx,20); ctx.lineTo(cx,20+plotH); ctx.stroke(); ctx.setLineDash([]); }
    const footer=document.getElementById(footerId); if(footer){ footer.innerHTML = `Observed χ²=${chi2Value.toFixed(3)}; critical (α=${alpha})=${crit}`; }
  }

  // Error function approximation
  function erf(x) {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * x);
    const y =
      1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t * Math.exp(-x * x));

    return sign * y;
  }

});
