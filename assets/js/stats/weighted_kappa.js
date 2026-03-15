/* =========================
   Weighted Cohen's Kappa
   ========================= */

document.addEventListener("DOMContentLoaded", () => {

  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  function activateTab(tabId) {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));

    document
      .querySelector(`.tab[data-tab="${tabId}"]`)
      .classList.add("active");

    document.getElementById(tabId).classList.add("active");
  }

  document.getElementById("runBtn").addEventListener("click", () => {

    const wType = document.getElementById("weightType").value;

    const O = [
      [c11.valueAsNumber, c12.valueAsNumber, c13.valueAsNumber],
      [c21.valueAsNumber, c22.valueAsNumber, c23.valueAsNumber],
      [c31.valueAsNumber, c32.valueAsNumber, c33.valueAsNumber]
    ];

    const k = 3;

    const n = O.flat().reduce((a,b) => a + b, 0);
    let html = "<h3>Results</h3>";

    if (n === 0) {
      html += `<div class="warn">Total sample size is zero.</div>`;
      document.getElementById("results").innerHTML = html;
      activateTab("analysis");
      return;
    }

    /* Marginals */
    const row = Array(k).fill(0);
    const col = Array(k).fill(0);

    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        row[i] += O[i][j];
        col[j] += O[i][j];
      }
    }

    /* Weight matrix */
    const W = [];
    for (let i = 0; i < k; i++) {
      W[i] = [];
      for (let j = 0; j < k; j++) {
        const d = Math.abs(i - j) / (k - 1);
        W[i][j] = wType === "quadratic" ? 1 - d*d : 1 - d;
      }
    }

    /* Observed weighted agreement */
    let Po = 0;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        Po += W[i][j] * O[i][j];
      }
    }
    Po /= n;

    /* Expected weighted agreement */
    let Pe = 0;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        Pe += W[i][j] * (row[i] * col[j] / n);
      }
    }
    Pe /= n;

    const kappa = (Po - Pe) / (1 - Pe);

    html += `
      <p><b>Weighting scheme:</b> ${wType}</p>
      <p><b>Observed weighted agreement (P<sub>o</sub>):</b> ${fmt(Po,3)}</p>
      <p><b>Expected weighted agreement (P<sub>e</sub>):</b> ${fmt(Pe,3)}</p>
      <p><b>Weighted Cohen’s Kappa:</b> ${fmt(kappa,3)}</p>
    `;

    let interp = "";
    if (kappa < 0) interp = "Poor agreement";
    else if (kappa < 0.21) interp = "Slight agreement";
    else if (kappa < 0.41) interp = "Fair agreement";
    else if (kappa < 0.61) interp = "Moderate agreement";
    else if (kappa < 0.81) interp = "Substantial agreement";
    else interp = "Almost perfect agreement";

    html += `<p><b>Interpretation:</b> ${interp}</p>`;

    document.getElementById("results").innerHTML = html;
    activateTab("analysis");
    try{
      const nObs = n;
      const Po_v = Po;
      const Pe_v = Pe;
      const denom = (1 - Pe_v) || 1;
      const varK = (Po_v * (1 - Po_v)) / (nObs * denom * denom);
      const seK = Math.sqrt(Math.max(0, varK));
      renderNormalVizWkappa('vizCanvasWkappa', kappa, seK, 0.05, 'vizFooterWkappa');
    }catch(e){ console.warn('wkappa viz', e); }
  });

  function renderNormalVizWkappa(canvasId, mean, se, alpha, footerId){
    const c = document.getElementById(canvasId); if(!c) return; const ctx = c.getContext('2d'); const W = c.parentElement.clientWidth || 700; const H = 220; c.width=W; c.height=H; ctx.clearRect(0,0,W,H);
    const pad=40; const plotW=W-pad*2; const plotH=H-80; const zcrit = Math.abs(inverseNormal(1-alpha/2));
    const xMin = Math.max(-1, mean - Math.max(4*se, Math.abs(mean)*1.2)); const xMax = Math.min(1, mean + Math.max(4*se, Math.abs(mean)*1.2));
    const pdf = x => Math.exp(-0.5*((x-mean)/se)**2)/(se*Math.sqrt(2*Math.PI)); let yMax=0; for(let x=xMin;x<=xMax;x+=(xMax-xMin)/400) yMax=Math.max(yMax,pdf(x));
    const toX=v=>pad + (v-xMin)/(xMax-xMin)*plotW; const toY=v=>20 + (plotH)*(1 - v/yMax);
    const ciLo = mean - zcrit*se, ciHi = mean + zcrit*se;
    ctx.fillStyle='rgba(59,130,246,0.12)'; ctx.beginPath(); for(let x=ciLo;x<=ciHi;x+=(xMax-xMin)/400) ctx.lineTo(toX(x), toY(pdf(x))); ctx.lineTo(toX(ciHi), toY(0)); ctx.lineTo(toX(ciLo), toY(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#ef4444'; ctx.lineWidth=2; ctx.beginPath(); for(let i=0;i<=400;i++){const x=xMin+i/400*(xMax-xMin); const y=toY(pdf(x)); i===0?ctx.moveTo(toX(x),y):ctx.lineTo(toX(x),y)} ctx.stroke();
    const nullX = toX(0); ctx.setLineDash([6,4]); ctx.strokeStyle='#ca8a04'; ctx.beginPath(); ctx.moveTo(nullX,20); ctx.lineTo(nullX,20+plotH); ctx.stroke(); ctx.setLineDash([]);
    const mX=toX(mean), mY=toY(pdf(mean)); ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.arc(mX,mY,6,0,Math.PI*2); ctx.fill();
    const footer = document.getElementById(footerId); if(footer){ const nullInCI = 0>=ciLo && 0<=ciHi; footer.innerHTML = nullInCI ? `H₀ not rejected — CI [${ciLo.toFixed(3)}, ${ciHi.toFixed(3)}] includes 0` : `H₀ rejected — CI [${ciLo.toFixed(3)}, ${ciHi.toFixed(3)}] excludes 0`; }
  }

});
