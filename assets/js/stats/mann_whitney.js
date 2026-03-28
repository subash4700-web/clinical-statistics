/* Mann–Whitney U test (rank-sum) — updated with settings support */

function el(id){ return document.getElementById(id); }

const state = {
  rows1: [],
  rows2: [],
  alpha: 0.05,
  tail: 'two',
  methodType: 'auto',
  showEffect: true,
  showViz: true,
  res: null
};

function parseTokens(text){
  return text.split(/[^0-9eE+\-\.]+/).map(Number).filter(x=>Number.isFinite(x));
}

function normalCDF(x){
  return (1 + erf(x/Math.sqrt(2)))/2;
}
function erf(x){
  const sign = Math.sign(x); x = Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t = 1/(1+p*x);
  const y = 1 - (((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t*Math.exp(-x*x));
  return sign*y;
}

function rankAll(arr){
  const indexed = arr.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
  const ranks = new Array(arr.length);
  let i=0;
  while(i<indexed.length){
    let j=i+1;
    while(j<indexed.length && indexed[j].v===indexed[i].v) j++;
    const rank = (i+1 + j)/2; // average rank
    for(let k=i;k<j;k++) ranks[indexed[k].i]=rank;
    i=j;
  }
  return ranks;
}

function median(arr){
  const sorted = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(sorted.length/2);
  return sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid])/2 : sorted[mid];
}

function mean(arr){ return arr.reduce((a,b)=>a+b,0)/arr.length; }

function quantile(sorted, p){
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function iqrOutliers(values){
  const s = [...values].sort((a,b)=>a-b);
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
  return {q1, q3, iqr, lo: q1 - 1.5*iqr, hi: q3 + 1.5*iqr};
}

function runMannWhitney(){
  // Read settings
  if(!el('chkIndep').checked){ showErr('Mann–Whitney requires independent groups.'); return; }
  if(!el('chkContinuous').checked){ showErr('Mann–Whitney requires numeric or ordinal data.'); return; }
  
  const raw1 = parseTokens(el('g1').value || '');
  const raw2 = parseTokens(el('g2').value || '');
  
  if (raw1.length < 1 || raw2.length < 1){ 
    showErr('Please enter at least one value per group.'); 
    return; 
  }

  // Store settings in state
  state.alpha = Number(el('alpha').value);
  state.tail = el('tail').value;
  state.methodType = el('methodType').value;
  state.showEffect = el('showEffect').checked;
  state.showViz = el('showViz').checked;

  // Outlier detection per group
  const out1 = iqrOutliers(raw1), out2 = iqrOutliers(raw2);
  state.rows1 = raw1.map(v => ({value: v, outlier: v < out1.lo || v > out1.hi, include: true}));
  state.rows2 = raw2.map(v => ({value: v, outlier: v < out2.lo || v > out2.hi, include: true}));
  state.out1 = out1;
  state.out2 = out2;

  // Switch to results tab
  document.querySelector('[data-tab="results"]').click();
  
  // Show outlier cards and render data tables
  el('outlierCard').style.display = 'block';
  el('outlierCard2').style.display = 'block';
  renderDataTable('dataTable1', state.rows1, 1);
  renderDataTable('dataTable2', state.rows2, 2);
  
  // Compute and render results
  setTimeout(() => recomputeAndRender(), 50);
}

function recomputeAndRender(){
  const g1 = state.rows1.filter(r => r.include).map(r => r.value);
  const g2 = state.rows2.filter(r => r.include).map(r => r.value);
  
  if(g1.length < 1 || g2.length < 1){
    el('resultsContent').innerHTML = `<div class="card" style="margin-top:16px;"><div class="alert bad"><strong>Cannot compute:</strong> Each group needs at least 1 included value.</div></div>`;
    return;
  }

  const alpha = state.alpha;
  const tail = state.tail;
  const methodType = state.methodType;
  const showEffect = state.showEffect;
  const showViz = state.showViz;

  const n1 = g1.length, n2 = g2.length, N = n1 + n2;
  const combined = g1.concat(g2);
  const ranks = rankAll(combined);

  const R1 = ranks.slice(0,n1).reduce((a,b)=>a+b,0);
  const U1 = R1 - n1*(n1+1)/2;
  const U2 = n1*n2 - U1;
  const U = Math.min(U1,U2);

  // tie correction
  const counts = {};
  for (const v of combined) counts[v] = (counts[v]||0) + 1;
  let T = 0;
  for (const k in counts){
    const t = counts[k]; if (t>1) T += (t*t*t - t);
  }
  const tieFactor = 1 - (T)/(N*(N*N - 1));

  const muU = n1*n2/2;
  const varU = n1*n2*(N+1)/12 * tieFactor;
  const sdU = Math.sqrt(varU);

  const z = ( (U1 - muU) ) / sdU;
  
  // Compute p-values based on tail
  let pValue, exactP = null;
  
  function nCr(n,k){
    if (k<0 || k>n) return 0;
    k = Math.min(k, n-k);
    let num = 1;
    for (let i=1;i<=k;i++) num = num * (n - k + i) / i;
    return Math.round(num);
  }

  const maxPerms = 200000;
  const totalPerms = nCr(N, n1);
  const useExact = methodType === 'exact' || (methodType === 'auto' && totalPerms <= maxPerms);
  
  if(useExact && totalPerms <= 1000000){
    // Compute exact p-value
    let countExtreme = 0;
    let comb = Array.from({length: n1}, (_,i)=>i);
    const obsDev = tail === 'two' ? Math.abs(U1 - muU) : (tail === 'right' ? U1 - muU : muU - U1);
    
    while(true){
      let R1p = 0;
      for (let idx of comb) R1p += ranks[idx];
      const U1p = R1p - n1*(n1+1)/2;
      const dev = tail === 'two' ? Math.abs(U1p - muU) : (tail === 'right' ? U1p - muU : muU - U1p);
      if (dev >= obsDev - 1e-9) countExtreme++;

      // next combination
      let i = n1 - 1;
      while(i >= 0 && comb[i] === i + N - n1) i--;
      if (i < 0) break;
      comb[i]++;
      for (let j = i+1; j < n1; j++) comb[j] = comb[j-1] + 1;
    }
    exactP = countExtreme / totalPerms;
    pValue = exactP;
  } else {
    // Normal approximation
    if(tail === 'two'){
      pValue = 2*(1 - normalCDF(Math.abs(z)));
    } else if(tail === 'right'){
      pValue = 1 - normalCDF(z);
    } else { // left
      pValue = normalCDF(z);
    }
  }

  const significant = pValue < alpha;
  
  // Effect size: rank-biserial correlation = 2*U1/(n1*n2) - 1
  const r = 2*U1/(n1*n2) - 1;

  // Store result
  state.res = {g1, g2, n1, n2, R1, U1, U2, U, z, pValue, exactP, totalPerms, 
               alpha, tail, significant, r, showEffect, showViz, methodType};
  
  // Render results
  renderResults(state.res);
}

function renderDataTable(tbody, rows, group){
  el(tbody).innerHTML = rows.map((r, i) => `
    <tr style="${r.outlier ? 'background:#fff7ed;' : ''}">
      <td>${i+1}</td>
      <td class="num">${r.value.toFixed(4)}</td>
      <td>${r.outlier ? '⚠ flagged' : ''}</td>
      <td><input type="checkbox" data-g="${group}" data-i="${i}" ${r.include ? 'checked' : ''} /></td>
    </tr>
  `).join('');
  
  el(tbody).querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const g = Number(e.target.dataset.g), i = Number(e.target.dataset.i);
      if(g === 1) state.rows1[i].include = e.target.checked;
      else state.rows2[i].include = e.target.checked;
      recomputeAndRender();
    });
  });
}

function renderResults(res){
  const {g1, g2, n1, n2, R1, U1, U2, U, z, pValue, exactP, totalPerms, 
         alpha, tail, significant, r, showEffect, showViz, methodType} = res;
  
  const resultsDiv = el('resultsContent');
  
  // Build HTML with rpt-section wrappers
  let html = `
    <div class="rpt-section" data-open="false" data-sec-id="screening">
      <div class="rpt-sec-hdr" onclick="toggleRptSection(this)">
        <span class="rpt-sec-title">Data Screening</span>
        <span class="rpt-sec-badge rpt-badge-ex">Excluded</span>
        <span class="rpt-sec-arrow">▶</span>
      </div>
      <div class="rpt-sec-body" style="display:none;">
        <div class="card">
          <div style="font-size:13px; line-height:1.6;">
            <strong>Group 1:</strong> ${state.rows1.length} values, ${state.rows1.filter(r=>r.outlier).length} flagged as outlier, ${state.rows1.filter(r=>r.include).length} included in analysis<br>
            <div class="note">IQR rule: Q1 = ${state.out1.q1.toFixed(3)}, Q3 = ${state.out1.q3.toFixed(3)}, IQR = ${state.out1.iqr.toFixed(3)}, bounds [${state.out1.lo.toFixed(3)}, ${state.out1.hi.toFixed(3)}]</div>
            <strong>Group 2:</strong> ${state.rows2.length} values, ${state.rows2.filter(r=>r.outlier).length} flagged as outlier, ${state.rows2.filter(r=>r.include).length} included in analysis<br>
            <div class="note">IQR rule: Q1 = ${state.out2.q1.toFixed(3)}, Q3 = ${state.out2.q3.toFixed(3)}, IQR = ${state.out2.iqr.toFixed(3)}, bounds [${state.out2.lo.toFixed(3)}, ${state.out2.hi.toFixed(3)}]</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rpt-section" data-open="true" data-sec-id="summary" style="margin-top:10px;">
      <div class="rpt-sec-hdr" onclick="toggleRptSection(this)">
        <span class="rpt-sec-title">Summary Statistics</span>
        <span class="rpt-sec-badge rpt-badge-in">In report</span>
        <span class="rpt-sec-arrow">▼</span>
      </div>
      <div class="rpt-sec-body">
        <div class="card">
          <table style="width:100%; font-size:13px;">
            <tr style="background:#f9fafb;">
              <th style="padding:8px;">Group</th>
              <th style="padding:8px; text-align:right;">n</th>
              <th style="padding:8px; text-align:right;">Median</th>
              <th style="padding:8px; text-align:right;">Mean</th>
              <th style="padding:8px; text-align:right;">Sum of Ranks</th>
            </tr>
            <tr>
              <td style="padding:8px;">Group 1</td>
              <td style="padding:8px; text-align:right;">${n1}</td>
              <td style="padding:8px; text-align:right;">${median(g1).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${mean(g1).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${R1.toFixed(1)}</td>
            </tr>
            <tr>
              <td style="padding:8px;">Group 2</td>
              <td style="padding:8px; text-align:right;">${n2}</td>
              <td style="padding:8px; text-align:right;">${median(g2).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${mean(g2).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${(n1+n2)*(n1+n2+1)/2 - R1.toFixed(1)}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <div class="rpt-section" data-open="true" data-sec-id="testresult" style="margin-top:10px;">
      <div class="rpt-sec-hdr" onclick="toggleRptSection(this)">
        <span class="rpt-sec-title">Test Result</span>
        <span class="rpt-sec-badge rpt-badge-in">In report</span>
        <span class="rpt-sec-arrow">▼</span>
      </div>
      <div class="rpt-sec-body">
        <div class="card">
          <div class="section-title">Test Statistics</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <div class="small" style="font-weight:800;">U₁ (Mann–Whitney)</div>
              <div style="font-size:20px; font-weight:900; margin-top:4px;">${U1.toFixed(2)}</div>
            </div>
            <div>
              <div class="small" style="font-weight:800;">U₂</div>
              <div style="font-size:20px; font-weight:900; margin-top:4px;">${U2.toFixed(2)}</div>
            </div>
          </div>
          <div style="margin-top:12px;">
            <div class="small" style="font-weight:800;">Standardized z-score (${methodType === 'exact' ? 'not applicable' : 'normal approximation'})</div>
            <div style="font-size:20px; font-weight:900; margin-top:4px;">${z.toFixed(4)}</div>
          </div>
        </div>
        <div class="card" style="margin-top:12px;">
          <div class="section-title">Hypothesis Test Result</div>
          <div style="padding:12px; background:${significant ? '#ecfdf5' : '#f1f5f9'}; border-radius:10px; margin-bottom:12px;">
            <div style="font-size:14px; font-weight:700; color:${significant ? '#15803d' : '#374151'};">
              ${significant ? 'REJECT H₀' : 'FAIL TO REJECT H₀'}
            </div>
            <div style="font-size:12px; color:${significant ? '#14532d' : '#374151'}; margin-top:4px;">
              ${tail === 'two' ? 'The distributions differ significantly' :
                (tail === 'right' ? 'Group 1 is significantly greater than Group 2' :
                                   'Group 1 is significantly less than Group 2')}
            </div>
          </div>
          <div style="font-size:13px;">
            <strong>p-value:</strong> ${pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(6)}<br>
            <strong>Significance level (α):</strong> ${alpha}<br>
            <strong>Test type:</strong> ${tail === 'two' ? 'Two-sided' : (tail === 'right' ? 'One-sided (Group 1 > Group 2)' : 'One-sided (Group 1 < Group 2)')}<br>
            ${exactP !== null ? `<strong>Method:</strong> Exact (${totalPerms.toLocaleString()} permutations enumerated)` :
                               `<strong>Method:</strong> Normal approximation with tie correction`}
          </div>
        </div>
      </div>
    </div>
  `;

  if(showEffect){
    html += `
      <div class="rpt-section" data-open="true" data-sec-id="effectsize" style="margin-top:10px;">
        <div class="rpt-sec-hdr" onclick="toggleRptSection(this)">
          <span class="rpt-sec-title">Effect Size</span>
          <span class="rpt-sec-badge rpt-badge-in">In report</span>
          <span class="rpt-sec-arrow">▼</span>
        </div>
        <div class="rpt-sec-body">
          <div class="card">
            <div class="small" style="font-weight:800;">Rank-biserial correlation (r)</div>
            <div style="font-size:20px; font-weight:900; margin-top:4px;">${r.toFixed(4)}</div>
            <div class="note" style="margin-top:8px;">
              Interpretation: |r| < 0.3 = small, 0.3-0.5 = medium, > 0.5 = large effect
            </div>
          </div>
        </div>
      </div>
    `;
  }

  resultsDiv.innerHTML = html;

  // Show the Add to Report button row
  const rptBtnRow = el('report-btn-row');
  if(rptBtnRow) rptBtnRow.style.display = 'block';
  
  // Render visualizations if enabled
  if(showViz){
    try{
      // Add hypothesis visualization card wrapped in rpt-section
      const vizCard = document.createElement('div');
      vizCard.className = 'rpt-section';
      vizCard.setAttribute('data-open', 'true');
      vizCard.setAttribute('data-sec-id', 'viz');
      vizCard.style.marginTop = '10px';
      
      // Build visualization HTML
      let vizHTML = `
        <div class="rpt-sec-hdr" onclick="toggleRptSection(this)">
          <span class="rpt-sec-title">Hypothesis Visualisation</span>
          <span class="rpt-sec-badge rpt-badge-in">In report</span>
          <span class="rpt-sec-arrow">▼</span>
        </div>
        <div class="rpt-sec-body">
        <div class="card">
        <div class="note"><strong>Data distributions:</strong> Boxplots compare the actual observed values in each group (medians, quartiles, outliers).</div>
        <div style="margin-top:12px;">
          <canvas id="vizBoxplotMW" height="200"></canvas>
        </div>
      `;
      
      // Only show normal approximation viz when actually using it
      if(exactP === null){
        vizHTML += `
        <div style="margin-top:16px;">
          <div class="note"><strong>Test statistic sampling distribution:</strong> This shows the theoretical distribution of the z-score <em>under the null hypothesis</em> (not the data distribution). When sample sizes are large enough, the test statistic follows a standard normal distribution. Shaded areas show rejection regions at α = ${alpha}.</div>
          <div style="margin-top:8px;">
            <canvas id="vizCanvasMW" height="220"></canvas>
          </div>
          <div id="vizFooterMW" style="margin-top:8px; border-radius:10px; padding:10px 14px; font-size:13px; font-weight:700; text-align:center; background:#f1f5f9; color:#6b7280;">—</div>
        </div>
        `;
      } else {
        vizHTML += `
        <div style="margin-top:16px; padding:12px; background:#f0f9ff; border-radius:10px; border:1px solid #bfdbfe;">
          <div style="font-size:13px; color:#1e40af; font-weight:600;">ℹ️ Exact Method Used</div>
          <div style="font-size:12px; color:#1e3a8a; margin-top:4px;">The p-value was calculated by enumerating all ${totalPerms.toLocaleString()} possible rank assignments. No approximation was needed, so no sampling distribution visualization is shown.</div>
        </div>
        `;
      }
      
      vizHTML += `
        <div style="margin-top:8px; background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; padding:10px 14px; font-size:12px; color:#78350f; line-height:1.6;">
          <strong style="color:#92400e;">Accuracy &amp; limitations:</strong> Boxplots show the actual observed data — they are exact representations of your sample, not assumptions. The normal approximation for the z-score (shown when using the large-sample method) is reliable for n₁ + n₂ ≥ 20 and becomes less accurate with very small groups or many tied ranks. For small samples the exact permutation p-value is used instead, and no sampling distribution is displayed. Mann-Whitney tests whether one group tends to have larger values (stochastic dominance) — it does <em>not</em> test for equal means or equal distributions.
        </div>
        </div></div>
      `;

      vizCard.innerHTML = vizHTML;
      resultsDiv.appendChild(vizCard);

      renderBoxplotViz(res.g1, res.g2);
      if(exactP === null){
        renderNormalViz(z, significant, alpha, tail);
      }
    }catch(e){ console.warn('viz failed', e); }
  }
}

function renderBoxplotViz(g1, g2){
  const c = el('vizBoxplotMW'); if(!c) return;
  const ctx = c.getContext('2d');
  const W = c.parentElement.clientWidth || 700; const H = 200; c.width = W; c.height = H;
  ctx.clearRect(0,0,W,H);
  
  // Calculate statistics for both groups
  function calcStats(arr){
    const sorted = [...arr].sort((a,b) => a-b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)];
    const q2 = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const min = Math.min(...sorted);
    const max = Math.max(...sorted);
    const whiskerLow = Math.max(min, lower);
    const whiskerHigh = Math.min(max, upper);
    const outliers = sorted.filter(v => v < lower || v > upper);
    return {q1, q2, q3, whiskerLow, whiskerHigh, outliers, min, max};
  }
  
  const stats1 = calcStats(g1);
  const stats2 = calcStats(g2);
  
  // Determine value range
  const allVals = [...g1, ...g2];
  const dataMin = Math.min(...allVals);
  const dataMax = Math.max(...allVals);
  const range = dataMax - dataMin;
  const xMin = dataMin - range * 0.1;
  const xMax = dataMax + range * 0.1;
  
  const pad = 60;
  const plotW = W - pad * 2;
  const plotH = H - 60;
  const toX = v => pad + (v - xMin) / (xMax - xMin) * plotW;
  
  // Group positions
  const y1 = 40;
  const y2 = 120;
  const boxHeight = 30;
  
  function drawBoxplot(stats, yCenter, color){
    const yTop = yCenter - boxHeight/2;
    const yBot = yCenter + boxHeight/2;
    
    // Box (IQR)
    ctx.fillStyle = color + '20';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(toX(stats.q1), yTop, toX(stats.q3) - toX(stats.q1), boxHeight);
    ctx.strokeRect(toX(stats.q1), yTop, toX(stats.q3) - toX(stats.q1), boxHeight);
    
    // Median line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(toX(stats.q2), yTop);
    ctx.lineTo(toX(stats.q2), yBot);
    ctx.stroke();
    
    // Whiskers
    ctx.lineWidth = 2;
    // Low whisker
    ctx.beginPath();
    ctx.moveTo(toX(stats.whiskerLow), yCenter);
    ctx.lineTo(toX(stats.q1), yCenter);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(stats.whiskerLow), yTop + 5);
    ctx.lineTo(toX(stats.whiskerLow), yBot - 5);
    ctx.stroke();
    
    // High whisker
    ctx.beginPath();
    ctx.moveTo(toX(stats.q3), yCenter);
    ctx.lineTo(toX(stats.whiskerHigh), yCenter);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(stats.whiskerHigh), yTop + 5);
    ctx.lineTo(toX(stats.whiskerHigh), yBot - 5);
    ctx.stroke();
    
    // Outliers
    ctx.fillStyle = color;
    for(const val of stats.outliers){
      ctx.beginPath();
      ctx.arc(toX(val), yCenter, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw boxplots
  drawBoxplot(stats1, y1, '#3b82f6');
  drawBoxplot(stats2, y2, '#10b981');
  
  // Labels
  ctx.font = 'bold 13px system-ui';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'right';
  ctx.fillText('Group 1', pad - 8, y1 + 5);
  ctx.fillText('Group 2', pad - 8, y2 + 5);
  
  // X-axis
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, H - 20);
  ctx.lineTo(W - pad, H - 20);
  ctx.stroke();
  
  // X-axis ticks
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  const tickCount = 5;
  for(let i = 0; i <= tickCount; i++){
    const val = xMin + (xMax - xMin) * i / tickCount;
    const x = toX(val);
    ctx.fillText(val.toFixed(1), x, H - 5);
  }
}

function renderNormalViz(z, significant, alpha, tail){
  const c = el('vizCanvasMW'); if(!c) return;
  const ctx = c.getContext('2d');
  const W = c.parentElement.clientWidth || 700; const H = 220; c.width = W; c.height = H;
  ctx.clearRect(0,0,W,H);
  
  const pad = 50; const plotW = W - pad*2; const plotH = H - 80;
  const mean = 0, se = 1;
  const xMin = -4, xMax = 4;
  const pdf = x => Math.exp(-0.5*x*x)/(Math.sqrt(2*Math.PI));
  let yMax = pdf(0);
  const toX = v => pad + (v - xMin)/(xMax - xMin)*plotW;
  const toY = v => 25 + (plotH) * (1 - v/yMax*0.9);

  // Critical values
  let zcrit;
  if(tail === 'two'){
    zcrit = Math.abs(inverseNormal(1 - alpha/2));
  } else {
    zcrit = inverseNormal(1 - alpha);
  }

  // Shade rejection regions
  ctx.fillStyle = 'rgba(239,68,68,0.15)';
  if(tail === 'two' || tail === 'left'){
    ctx.beginPath();
    const leftCrit = tail === 'two' ? -zcrit : -100;
    const endX = tail === 'two' ? -zcrit : inverseNormal(alpha);
    for(let x = xMin; x <= endX; x+= 0.02){ ctx.lineTo(toX(x), toY(pdf(x))); }
    ctx.lineTo(toX(endX), toY(0));
    ctx.lineTo(toX(xMin), toY(0));
    ctx.closePath();
    ctx.fill();
  }
  if(tail === 'two' || tail === 'right'){
    ctx.beginPath();
    const startX = tail === 'two' ? zcrit : inverseNormal(1 - alpha);
    for(let x = startX; x <= xMax; x+= 0.02){ ctx.lineTo(toX(x), toY(pdf(x))); }
    ctx.lineTo(toX(xMax), toY(0));
    ctx.lineTo(toX(startX), toY(0));
    ctx.closePath();
    ctx.fill();
  }

  // Draw curve
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5; ctx.beginPath();
  for(let i=0;i<=400;i++){ 
    const x = xMin + i/400*(xMax-xMin); 
    const y=toY(pdf(x)); 
    i===0?ctx.moveTo(toX(x),y):ctx.lineTo(toX(x),y); 
  }
  ctx.stroke();

  // Null line at 0
  const nullX = toX(0);
  ctx.setLineDash([6,4]); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth=2; ctx.beginPath(); 
  ctx.moveTo(nullX,25); ctx.lineTo(nullX,25+plotH); ctx.stroke(); ctx.setLineDash([]);

  // Observed z marker
  const obsX = toX(z); const obsY = toY(pdf(z)); 
  ctx.fillStyle = significant ? '#ef4444' : '#6b7280'; 
  ctx.beginPath(); ctx.arc(obsX, obsY, 6, 0, Math.PI*2); ctx.fill();

  // Label
  ctx.save();
  ctx.font = 'bold 11px system-ui';
  ctx.fillStyle = significant ? '#991b1b' : '#374151';
  ctx.textAlign = 'center';
  ctx.fillText(`z = ${z.toFixed(3)}`, obsX, obsY - 12);
  ctx.restore();

  // Footer
  const footer = el('vizFooterMW');
  if(footer){
    footer.style.background = significant ? '#ecfdf5' : '#f1f5f9';
    footer.style.color = significant ? '#14532d' : '#374151';
    footer.innerHTML = significant ? 
      `Observed z-score falls in rejection region — statistically significant at α = ${alpha}` :
      `Observed z-score does not fall in rejection region — not statistically significant at α = ${alpha}`;
  }
}

function inverseNormal(p){
  // Approximation for standard normal quantile
  if(p <= 0) return -Infinity;
  if(p >= 1) return Infinity;
  if(p === 0.5) return 0;
  
  const a1 = -3.969683028665376e+01;
  const a2 =  2.209460984245205e+02;
  const a3 = -2.759285104469687e+02;
  const a4 =  1.383577518672690e+02;
  const a5 = -3.066479806614716e+01;
  const a6 =  2.506628277459239e+00;
  
  const b1 = -5.447609879822406e+01;
  const b2 =  1.615858368580409e+02;
  const b3 = -1.556989798598866e+02;
  const b4 =  6.680131188771972e+01;
  const b5 = -1.328068155288572e+01;
  
  const c1 = -7.784894002430293e-03;
  const c2 = -3.223964580411365e-01;
  const c3 = -2.400758277161838e+00;
  const c4 = -2.549732539343734e+00;
  const c5 =  4.374664141464968e+00;
  const c6 =  2.938163982698783e+00;
  
  const d1 =  7.784695709041462e-03;
  const d2 =  3.224671290700398e-01;
  const d3 =  2.445134137142996e+00;
  const d4 =  3.754408661907416e+00;
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q, r;
  if(p < pLow){
    q = Math.sqrt(-2*Math.log(p));
    return (((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6) / ((((d1*q+d2)*q+d3)*q+d4)*q+1);
  } else if(p <= pHigh){
    q = p - 0.5;
    r = q*q;
    return (((((a1*r+a2)*r+a3)*r+a4)*r+a5)*r+a6)*q / (((((b1*r+b2)*r+b3)*r+b4)*r+b5)*r+1);
  } else {
    q = Math.sqrt(-2*Math.log(1-p));
    return -(((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6) / ((((d1*q+d2)*q+d3)*q+d4)*q+1);
  }
}

function showErr(msg){ 
  el('inputError').style.display='block'; 
  el('inputError').textContent=msg; 
}

/* ========= Generate sample data ========= */
function generateGroupData(groupNum){
  const n = parseInt(el(`genN${groupNum}`).value);
  const dist = el(`genDist${groupNum}`).value;
  const medianTarget = Number(el(`genMedian${groupNum}`).value);
  const spread = Number(el(`genSpread${groupNum}`).value);
  
  if(!n || n < 1 || !Number.isFinite(medianTarget) || !Number.isFinite(spread) || spread <= 0){
    alert(`Invalid parameters for Group ${groupNum}`);
    return null;
  }
  
  // Simple seeded random
  let rngState = Math.floor(Math.random() * 1e9);
  function seededRandom(){
    rngState = (rngState * 9301 + 49297) % 233280;
    return rngState / 233280;
  }
  
  const data = [];
  for(let i = 0; i < n; i++){
    let value;
    if(dist === 'skewed'){
      // Log-normal distribution (skewed right)
      // Generate normal, then exponentiate
      const u1 = seededRandom();
      const u2 = seededRandom();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      // For log-normal: median = exp(μ), spread affects σ
      const mu = Math.log(medianTarget);
      const sigma = spread * 0.5; // scale spread to reasonable σ
      value = Math.exp(mu + z * sigma);
    } else if(dist === 'exponential'){
      // Exponential distribution (heavily right-skewed)
      // median = λ * ln(2), so λ = median / ln(2)
      const lambda = medianTarget / Math.log(2);
      const u = seededRandom();
      value = -lambda * Math.log(1 - u);
      // spread parameter adjusts scale
      value = medianTarget + (value - medianTarget) * spread;
    } else {
      // Uniform distribution
      const u = seededRandom();
      value = medianTarget + (u - 0.5) * spread * Math.sqrt(12);
    }
    data.push(value.toFixed(2));
  }
  
  return data;
}

function refreshGeneratedGroup(groupNum){
  const data = generateGroupData(groupNum);
  if(!data) return;
  
  const output = el(`generatedOutput${groupNum}`);
  output.value = data.join('\n');
  el(`useGeneratedBtn${groupNum}`).style.display = 'inline-block';
}

function useGeneratedData(groupNum){
  const generated = el(`generatedOutput${groupNum}`)?.value;
  if(!generated) return;
  el(`g${groupNum}`).value = generated;
  el('inputError').style.display = 'none';
  // Only auto-run when both groups have data
  if(el('g1').value.trim() && el('g2').value.trim()) runMannWhitney();
}

document.addEventListener('DOMContentLoaded', ()=>{
  el('runBtn').addEventListener('click', runMannWhitney);
  el('clearBtn').addEventListener('click', ()=>{ 
    el('g1').value=''; 
    el('g2').value=''; 
    el('resultsContent').innerHTML=''; 
    el('inputError').style.display='none';
    el('outlierCard').style.display='none';
    el('outlierCard2').style.display='none';
    state.rows1 = [];
    state.rows2 = [];
    state.res = null;
  });
  
  // Generate data listeners
  el('generateBtn1').addEventListener('click', () => refreshGeneratedGroup(1));
  el('generateBtn2').addEventListener('click', () => refreshGeneratedGroup(2));
  el('useGeneratedBtn1').addEventListener('click', () => useGeneratedData(1));
  el('useGeneratedBtn2').addEventListener('click', () => useGeneratedData(2));
});

console.log('mann_whitney.js loaded');
