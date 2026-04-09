/* Wilcoxon signed-rank test — updated with settings support */

function el(id){ return document.getElementById(id); }

const state = {
  rows: [],
  alpha: 0.05,
  tail: 'two',
  methodType: 'auto',
  showEffect: true,
  showViz: true,
  res: null,
  outInfo: null
};

function parsePairsText(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const pairs = [];
  for(const ln of lines){
    const parts = ln.split(/[^0-9eE+\-\.]+/).map(Number).filter(x=>Number.isFinite(x));
    if (parts.length >=2) pairs.push([parts[0], parts[1]]);
  }
  return pairs;
}

function rankAbsolute(arr){
  const indexed = arr.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
  const ranks = new Array(arr.length);
  let i=0;
  while(i<indexed.length){
    let j=i+1;
    while(j<indexed.length && indexed[j].v===indexed[i].v) j++;
    const rank = (i+1 + j)/2;
    for(let k=i;k<j;k++) ranks[indexed[k].i]=rank;
    i=j;
  }
  return ranks;
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
  if(values.length < 4) {
    // Too few values for meaningful IQR outlier detection
    const min = Math.min(...values);
    const max = Math.max(...values);
    return {q1: min, q3: max, iqr: max-min, lo: min - 1e10, hi: max + 1e10};
  }
  const s = [...values].sort((a,b)=>a-b);
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
  const lo = q1 - 1.5*iqr;
  const hi = q3 + 1.5*iqr;
  return {q1, q3, iqr, lo, hi};
}

function runWilcoxon(){
  // Read settings
  if(!el('chkPaired').checked){ showErr('Wilcoxon requires paired observations.'); return; }
  if(!el('chkContinuous').checked){ showErr('Wilcoxon requires numeric or ordinal data.'); return; }
  
  const text = el('pairs').value || '';
  const pairs = parsePairsText(text);
  
  if (pairs.length < 2){ 
    showErr('Please enter at least two pairs.'); 
    return; 
  }

  // Store settings in state
  state.alpha = Number(el('alpha').value);
  state.tail = el('tail').value;
  state.methodType = el('methodType').value;
  state.showEffect = el('showEffect').checked;
  state.showViz = el('showViz').checked;

  // Calculate differences
  const diffs = pairs.map(([before, after]) => after - before);
  
  // Outlier detection on differences
  const outInfo = iqrOutliers(diffs);
  state.outInfo = outInfo;
  state.rows = pairs.map(([before, after], i) => {
    const diff = after - before;
    const outlier = diff < outInfo.lo || diff > outInfo.hi;
    return {before, after, diff, outlier, include: true};
  });

  // Switch to results tab
  document.querySelector('[data-tab="results"]').click();
  
  // Show outlier card and render data table
  el('outlierCard').style.display = 'block';
  renderDataTable();
  
  // Compute and render results
  setTimeout(() => recomputeAndRender(), 50);
}

function recomputeAndRender(){
  const included = state.rows.filter(r => r.include);
  
  if(included.length < 2){
    el('resultsContent').innerHTML = `<div class="card" style="margin-top:16px;"><div class="alert bad"><strong>Cannot compute:</strong> Need at least 2 included pairs.</div></div>`;
    return;
  }

  const diffs = included.map(r => r.diff);
  const nonzero = diffs.map((d,i)=>({idx:i, val:d})).filter(o=>Math.abs(o.val) > 1e-10);
  const n = nonzero.length;
  
  if (n === 0){ 
    el('resultsContent').innerHTML = `<div class="card" style="margin-top:16px;"><div class="alert bad"><strong>Cannot compute:</strong> All differences are zero.</div></div>`;
    return;
  }

  const absVals = nonzero.map(o=>Math.abs(o.val));
  const ranks = rankAbsolute(absVals);
  let Wpos = 0, Wneg = 0;
  for(let i=0; i<n; i++){
    const s = Math.sign(nonzero[i].val);
    if (s > 0) Wpos += ranks[i];
    else Wneg += ranks[i];
  }

  const W = Math.min(Wpos, Wneg);
  const meanW = n*(n+1)/4;
  const sdW = Math.sqrt(n*(n+1)*(2*n+1)/24);
  const z = (W - meanW) / sdW;
  
  // Compute p-values based on tail
  let pValue, exactP = null;
  const maxPerms = 200000;
  const totalPerms = Math.pow(2, n);
  const useExact = state.methodType === 'exact' || (state.methodType === 'auto' && totalPerms <= maxPerms);
  
  if(useExact && totalPerms <= 1000000){
    // Exact sign permutation
    const obsW = state.tail === 'two' ? Math.abs(Wpos - meanW) : 
                 (state.tail === 'right' ? Wpos - meanW : meanW - Wpos);
    let countExtreme = 0;
    
    for (let mask = 0; mask < totalPerms; mask++){
      let Wp = 0;
      for (let i = 0; i < n; i++){
        if (mask & (1 << i)) Wp += ranks[i];
      }
      const testW = state.tail === 'two' ? Math.abs(Wp - meanW) :
                    (state.tail === 'right' ? Wp - meanW : meanW - Wp);
      if (testW >= obsW - 1e-9) countExtreme++;
    }
    exactP = countExtreme / totalPerms;
    pValue = exactP;
  } else {
    // Normal approximation
    if(state.tail === 'two'){
      pValue = 2*(1 - normalCDF(Math.abs(z)));
    } else if(state.tail === 'right'){
      const zRight = (Wpos - meanW) / sdW;
      pValue = 1 - normalCDF(zRight);
    } else {
      const zLeft = (Wpos - meanW) / sdW;
      pValue = normalCDF(zLeft);
    }
  }

  const significant = pValue < state.alpha;
  
  // Effect size: matched-pairs rank-biserial correlation = (W+ - W-) / (total sum of ranks)
  const totalRankSum = n * (n + 1) / 2;
  const r = (Wpos - Wneg) / totalRankSum;

  // Store result
  state.res = {diffs, before: included.map(r => r.before), after: included.map(r => r.after),
               n, Wpos, Wneg, W, z, pValue, exactP, totalPerms, 
               alpha: state.alpha, tail: state.tail, significant, r, 
               showEffect: state.showEffect, showViz: state.showViz, 
               methodType: state.methodType};
  
  // Render results
  renderResults(state.res);
}

function renderDataTable(){
  el('dataTable').innerHTML = state.rows.map((r, i) => `
    <tr style="${r.outlier ? 'background:#fff7ed;' : ''}">
      <td>${i+1}</td>
      <td class="num">${r.before.toFixed(4)}</td>
      <td class="num">${r.after.toFixed(4)}</td>
      <td class="num">${r.diff.toFixed(4)}</td>
      <td>${r.outlier ? '⚠ flagged' : ''}</td>
      <td><input type="checkbox" data-i="${i}" ${r.include ? 'checked' : ''} /></td>
    </tr>
  `).join('');
  
  el('dataTable').querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', e => {
      const i = Number(e.target.dataset.i);
      state.rows[i].include = e.target.checked;
      recomputeAndRender();
    });
  });
}

function renderResults(res){
  const {diffs, before, after, n, Wpos, Wneg, W, z, pValue, exactP, totalPerms, 
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
            <strong>Total pairs:</strong> ${state.rows.length}<br>
            <strong>Outliers flagged:</strong> ${state.rows.filter(r=>r.outlier).length}<br>
            <strong>Included in analysis:</strong> ${state.rows.filter(r=>r.include).length}<br>
            <div class="note">IQR rule on differences: Q1 = ${state.outInfo.q1.toFixed(3)}, Q3 = ${state.outInfo.q3.toFixed(3)}, IQR = ${state.outInfo.iqr.toFixed(3)}, bounds [${state.outInfo.lo.toFixed(3)}, ${state.outInfo.hi.toFixed(3)}]</div>
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
              <th style="padding:8px;">Measure</th>
              <th style="padding:8px; text-align:right;">Before</th>
              <th style="padding:8px; text-align:right;">After</th>
              <th style="padding:8px; text-align:right;">Difference</th>
            </tr>
            <tr>
              <td style="padding:8px;">n</td>
              <td style="padding:8px; text-align:right;" colspan="2">${n}</td>
              <td style="padding:8px; text-align:right;">${n} (non-zero)</td>
            </tr>
            <tr>
              <td style="padding:8px;">Median</td>
              <td style="padding:8px; text-align:right;">${median(before).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${median(after).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${median(diffs).toFixed(3)}</td>
            </tr>
            <tr>
              <td style="padding:8px;">Mean</td>
              <td style="padding:8px; text-align:right;">${mean(before).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${mean(after).toFixed(3)}</td>
              <td style="padding:8px; text-align:right;">${mean(diffs).toFixed(3)}</td>
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
              <div class="small" style="font-weight:800;">W+ (positive ranks)</div>
              <div style="font-size:20px; font-weight:900; margin-top:4px;">${Wpos.toFixed(2)}</div>
            </div>
            <div>
              <div class="small" style="font-weight:800;">W− (negative ranks)</div>
              <div style="font-size:20px; font-weight:900; margin-top:4px;">${Wneg.toFixed(2)}</div>
            </div>
          </div>
          <div style="margin-top:12px;">
            <div class="small" style="font-weight:800;">W (min of W+, W−)</div>
            <div style="font-size:20px; font-weight:900; margin-top:4px;">${W.toFixed(2)}</div>
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
              ${tail === 'two' ? 'The median difference is significantly different from zero' :
                (tail === 'right' ? 'After is significantly greater than Before' :
                                   'After is significantly less than Before')}
            </div>
          </div>
          <div style="font-size:13px;">
            <strong>p-value:</strong> ${pValue < 0.0001 ? '< 0.0001' : pValue.toFixed(6)}<br>
            <strong>Significance level (α):</strong> ${alpha}<br>
            <strong>Test type:</strong> ${tail === 'two' ? 'Two-sided' : (tail === 'right' ? 'One-sided (After > Before)' : 'One-sided (After < Before)')}<br>
            ${exactP !== null ? `<strong>Method:</strong> Exact (${totalPerms.toLocaleString()} sign permutations enumerated)` :
                               `<strong>Method:</strong> Normal approximation`}
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
            <div class="small" style="font-weight:800;">Matched-pairs rank-biserial correlation (r)</div>
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
  if (typeof wrapSectionsForReport === 'function') wrapSectionsForReport('resultsContent');

  // Show the Add to Report button row
  const rptBtnRow = el('report-btn-row');
  if(rptBtnRow) rptBtnRow.style.display = 'block';
  
  // Render visualizations if enabled
  if(showViz){
    try{
      // Add hypothesis visualization card wrapped in rpt-section
      const vizCard = document.createElement('div');
      vizCard.id = 'vizSections';
      // Build three separate viz sections
      let vizHTML = '';

      // 1. Paired comparison boxplot
      vizHTML += `<div class="section-title">Paired Comparison</div>`;
      vizHTML += `<div class="card"><div class="note">Boxplots compare Before vs After measurements, showing medians, quartiles, and outliers.</div>`;
      vizHTML += `<div style="margin-top:12px;"><canvas id="vizPairedBox" height="200"></canvas></div></div>`;

      // 2. Difference distribution
      vizHTML += `<div class="section-title">Difference Distribution</div>`;
      vizHTML += `<div class="card"><div class="note">Boxplot shows the distribution of differences (After − Before) that the test analyzes. The red dashed line marks zero (H₀).</div>`;
      vizHTML += `<div style="margin-top:8px;"><canvas id="vizDiffBox" height="180"></canvas></div></div>`;

      // 3. Sampling distribution (only for normal approx)
      if (exactP === null) {
        vizHTML += `<div class="section-title">Sampling Distribution</div>`;
        vizHTML += `<div class="card"><div class="note">Theoretical distribution of the z-score under H₀. Shaded areas show rejection regions at α = ${alpha}.</div>`;
        vizHTML += `<div style="margin-top:8px;"><canvas id="vizCanvasWil" height="220"></canvas></div>`;
        vizHTML += `<div id="vizFooterWil" style="margin-top:8px; border-radius:10px; padding:10px 14px; font-size:13px; font-weight:700; text-align:center; background:#f1f5f9; color:#6b7280;">—</div></div>`;
      } else {
        vizHTML += `<div style="margin-top:12px; padding:12px; background:#f0f9ff; border-radius:10px; border:1px solid #bfdbfe;">`;
        vizHTML += `<div style="font-size:13px; color:#1e40af; font-weight:600;">Exact method used</div>`;
        vizHTML += `<div style="font-size:12px; color:#1e3a8a; margin-top:4px;">P-value calculated by enumerating all ${totalPerms.toLocaleString()} possible sign assignments. No approximation needed.</div></div>`;
      }

      vizCard.innerHTML = vizHTML;
      resultsDiv.appendChild(vizCard);

      // Render charts first (they need canvas elements in DOM)
      renderDiffHistogram(before, after, diffs);
      if(exactP === null){
        renderNormalViz(z, significant, alpha, tail);
      }

      // Then wrap into individual report sections (after canvases are drawn)
      if (typeof wrapSectionsForReport === 'function') wrapSectionsForReport('vizSections');
    }catch(e){ console.warn('viz failed', e); }
  }
}

function renderDiffHistogram(before, after, diffs){
  setTimeout(()=>{
    // Draw paired boxplots
    const cPaired = el('vizPairedBox');
    if(cPaired && before && after && before.length > 0){
      const ctx = cPaired.getContext('2d');
      const W = cPaired.parentElement.clientWidth || 700;
      const H = 200;
      cPaired.width = W;
      cPaired.height = H;
      ctx.clearRect(0,0,W,H);
      
      const pad = 60;
      const plotW = W - pad * 2;
      const plotH = H - 60;
      
      // Combined min/max for consistent y-axis
      const allVals = [...before, ...after];
      const minVal = Math.min(...allVals);
      const maxVal = Math.max(...allVals);
      const valRange = maxVal - minVal || 1;
      const yScale = (v)=> pad + plotH - ((v - minVal)/valRange)*plotH;
      
      // Draw Before boxplot (left)
      const beforeStats = getBoxplotStats(before);
      if(beforeStats){
        drawVerticalBoxplot(ctx, pad + plotW*0.25, yScale, beforeStats, 'Before', '#4682b4', pad, plotH);
      }
      
      // Draw After boxplot (right)
      const afterStats = getBoxplotStats(after);
      if(afterStats){
        drawVerticalBoxplot(ctx, pad + plotW*0.75, yScale, afterStats, 'After', '#e67e22', pad, plotH);
      }
      
      // Y-axis
      ctx.strokeStyle='#555';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(pad, pad+plotH);
      ctx.stroke();
      
      // Y-axis labels
      ctx.fillStyle='#333';
      ctx.font='11px sans-serif';
      ctx.textAlign='right';
      ctx.fillText(maxVal.toFixed(1), pad-5, pad+5);
      ctx.fillText(minVal.toFixed(1), pad-5, pad+plotH);
      
      ctx.save();
      ctx.translate(15, H/2);
      ctx.rotate(-Math.PI/2);
      ctx.textAlign='center';
      ctx.fillText('Value', 0, 0);
      ctx.restore();
    }
    
    // Draw difference boxplot
    const cDiff = el('vizDiffBox');
    if(cDiff && diffs && diffs.length > 0){
      const ctx = cDiff.getContext('2d');
      const W = cDiff.parentElement.clientWidth || 700;
      const H = 180;
      cDiff.width = W;
      cDiff.height = H;
      ctx.clearRect(0,0,W,H);
      
      const pad = 60;
      const plotW = W - pad * 2;
      const plotH = H - 60;
      
      const minD = Math.min(...diffs, 0);
      const maxD = Math.max(...diffs, 0);
      const dRange = maxD - minD || 1;
      const xScale = (v)=> pad + ((v - minD)/dRange)*plotW;
      
      // Get difference stats
      const diffStats = getBoxplotStats(diffs);
      
      if(diffStats){
        // Draw horizontal boxplot for differences
        const centerY = pad + plotH/2;
        drawHorizontalBoxplot(ctx, xScale, centerY, diffStats, '#2ecc71');
      }
      
      // Draw zero line
      const zeroX = xScale(0);
      ctx.strokeStyle='red';
      ctx.lineWidth=2;
      ctx.setLineDash([5,3]);
      ctx.beginPath();
      ctx.moveTo(zeroX, pad);
      ctx.lineTo(zeroX, pad+plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // X-axis
      ctx.strokeStyle='#555';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(pad, pad+plotH/2);
      ctx.lineTo(pad+plotW, pad+plotH/2);
      ctx.stroke();
      
      // X-axis labels
      ctx.fillStyle='#333';
      ctx.font='11px sans-serif';
      ctx.textAlign='center';
      ctx.fillText(minD.toFixed(1), pad, H-10);
      ctx.fillText('0', zeroX, H-10);
      ctx.fillText(maxD.toFixed(1), pad+plotW, H-10);
      
      ctx.textAlign='center';
      ctx.fillText('Difference (After - Before)', W/2, 20);
    }
  }, 10);
}

function getBoxplotStats(vals){
  if(!vals || vals.length === 0) return null;
  const sorted = vals.slice().sort((a,b)=>a-b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n*0.25)];
  const median = n%2===0 ? (sorted[n/2-1]+sorted[n/2])/2 : sorted[Math.floor(n/2)];
  const q3 = sorted[Math.floor(n*0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5*iqr;
  const upperBound = q3 + 1.5*iqr;
  
  const inBounds = sorted.filter(v=>v>=lowerBound && v<=upperBound);
  const whiskerMin = inBounds.length > 0 ? Math.min(...inBounds) : sorted[0];
  const whiskerMax = inBounds.length > 0 ? Math.max(...inBounds) : sorted[n-1];
  const outliers = sorted.filter(v=> v<lowerBound || v>upperBound);
  return {q1, median, q3, whiskerMin, whiskerMax, outliers};
}

function drawVerticalBoxplot(ctx, centerX, yScale, stats, label, color, pad, plotH){
  if(!stats) return;
  const boxW = 50;
  const halfBox = boxW/2;
  
  // Whiskers
  ctx.strokeStyle='#555';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(centerX, yScale(stats.whiskerMin));
  ctx.lineTo(centerX, yScale(stats.whiskerMax));
  ctx.stroke();
  // Whisker caps
  ctx.beginPath();
  ctx.moveTo(centerX-10, yScale(stats.whiskerMin));
  ctx.lineTo(centerX+10, yScale(stats.whiskerMin));
  ctx.moveTo(centerX-10, yScale(stats.whiskerMax));
  ctx.lineTo(centerX+10, yScale(stats.whiskerMax));
  ctx.stroke();
  
  // Box
  ctx.fillStyle = color + '40';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const boxTop = yScale(stats.q3);
  const boxBottom = yScale(stats.q1);
  ctx.fillRect(centerX-halfBox, boxTop, boxW, boxBottom-boxTop);
  ctx.strokeRect(centerX-halfBox, boxTop, boxW, boxBottom-boxTop);
  
  // Median line
  ctx.strokeStyle='#000';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(centerX-halfBox, yScale(stats.median));
  ctx.lineTo(centerX+halfBox, yScale(stats.median));
  ctx.stroke();
  
  // Outliers
  ctx.fillStyle = color;
  stats.outliers.forEach(out=>{
    ctx.beginPath();
    ctx.arc(centerX, yScale(out), 3, 0, 2*Math.PI);
    ctx.fill();
  });
  
  // Label
  ctx.fillStyle='#333';
  ctx.font='12px sans-serif';
  ctx.textAlign='center';
  ctx.fillText(label, centerX, pad+plotH+20);
}

function drawHorizontalBoxplot(ctx, xScale, centerY, stats, color){
  if(!stats) return;
  const boxH = 40;
  const halfBox = boxH/2;
  
  // Whiskers (horizontal)
  ctx.strokeStyle='#555';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(xScale(stats.whiskerMin), centerY);
  ctx.lineTo(xScale(stats.whiskerMax), centerY);
  ctx.stroke();
  // Whisker caps
  ctx.beginPath();
  ctx.moveTo(xScale(stats.whiskerMin), centerY-10);
  ctx.lineTo(xScale(stats.whiskerMin), centerY+10);
  ctx.moveTo(xScale(stats.whiskerMax), centerY-10);
  ctx.lineTo(xScale(stats.whiskerMax), centerY+10);
  ctx.stroke();
  
  // Box (horizontal)
  ctx.fillStyle = color + '40';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const boxLeft = xScale(stats.q1);
  const boxRight = xScale(stats.q3);
  ctx.fillRect(boxLeft, centerY-halfBox, boxRight-boxLeft, boxH);
  ctx.strokeRect(boxLeft, centerY-halfBox, boxRight-boxLeft, boxH);
  
  // Median line (vertical in horizontal boxplot)
  ctx.strokeStyle='#000';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(xScale(stats.median), centerY-halfBox);
  ctx.lineTo(xScale(stats.median), centerY+halfBox);
  ctx.stroke();
  
  // Outliers
  ctx.fillStyle = color;
  stats.outliers.forEach(out=>{
    ctx.beginPath();
    ctx.arc(xScale(out), centerY, 3, 0, 2*Math.PI);
    ctx.fill();
  });
}

function renderNormalViz(z, significant, alpha, tail){
  const c = el('vizCanvasWil'); if(!c) return;
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
  const footer = el('vizFooterWil');
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

function generatePairedData(){
  const n = parseInt(el('genN').value);
  const dist = el('genDist').value;
  const medianBefore = Number(el('genMedianBefore').value);
  const medianAfter = Number(el('genMedianAfter').value);
  const spread = Number(el('genSpread').value);
  const corr = Number(el('genCorr').value);
  
  if(!n || n < 1 || !Number.isFinite(medianBefore) || !Number.isFinite(medianAfter) || 
     !Number.isFinite(spread) || spread <= 0 || !Number.isFinite(corr) || corr < 0 || corr > 1){
    alert('Invalid parameters');
    return null;
  }
  
  // Simple seeded random
  let rngState = Math.floor(Math.random() * 1e9);
  function seededRandom(){
    rngState = (rngState * 9301 + 49297) % 233280;
    return rngState / 233280;
  }
  
  function generateValue(median, dist, spread){
    if(dist === 'skewed'){
      const u1 = seededRandom();
      const u2 = seededRandom();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const mu = Math.log(median);
      const sigma = spread * 0.5;
      return Math.exp(mu + z * sigma);
    } else if(dist === 'exponential'){
      const lambda = median / Math.log(2);
      const u = seededRandom();
      const value = -lambda * Math.log(1 - u);
      return median + (value - median) * spread;
    } else {
      const u = seededRandom();
      return median + (u - 0.5) * spread * Math.sqrt(12);
    }
  }
  
  const pairs = [];
  for(let i = 0; i < n; i++){
    const baseValue = generateValue(medianBefore, dist, spread);
    const shift = medianAfter - medianBefore;
    // Create correlated after value
    const afterValue = baseValue + shift + (1 - corr) * (generateValue(0, 'uniform', spread) - spread/2);
    pairs.push([baseValue.toFixed(2), Math.max(0, afterValue).toFixed(2)]);
  }
  
  return pairs;
}

function refreshGeneratedData(){
  const pairs = generatePairedData();
  if(!pairs) return;
  
  const output = el('generatedOutput');
  output.value = 'Before\tAfter\n' + pairs.map(p => p.join('\t')).join('\n');
  el('useGeneratedBtn').style.display = 'inline-block';
}

function useGeneratedData(){
  const generated = el('generatedOutput').value;
  if(!generated) return;
  el('pairs').value = generated;
  el('inputError').style.display = 'none';
  runWilcoxon();
}

document.addEventListener('DOMContentLoaded', ()=>{
  el('runBtn').addEventListener('click', runWilcoxon);
  el('clearBtn').addEventListener('click', ()=>{ 
    el('pairs').value=''; 
    el('resultsContent').innerHTML=''; 
    el('inputError').style.display='none';
    el('outlierCard').style.display='none';
    state.rows = [];
    state.res = null;
  });
  
  // Generate data listeners
  el('generateBtn').addEventListener('click', refreshGeneratedData);
  el('useGeneratedBtn').addEventListener('click', useGeneratedData);
});

console.log('wilcoxon_signed_rank.js loaded');
