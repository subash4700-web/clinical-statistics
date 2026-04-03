// ── EFLM biological variation database (Ricos et al. 2014) ──
// ref: { lo, hi, cutoff } — lo/hi = reference interval, cutoff = clinical decision threshold
// Shared by method_comparison.html and precision_ep05.html

const EFLM_DB = {
  // ── General chemistry ───────────────────────────────────────────────────
  albumin:      { name:'Albumin',           unit:'g/L',   cvi:3.1,  cvg:4.2,  ref:{lo:35,   hi:50,   note:'Reference interval'} },
  alp:          { name:'ALP',               unit:'U/L',   cvi:6.4,  cvg:26.1, ref:{hi:130,  note:'Upper limit'} },
  alt:          { name:'ALT',               unit:'U/L',   cvi:18.3, cvg:41.6, ref:{hi:45,   note:'Upper limit (sex-dependent)'} },
  amylase:      { name:'Amylase',           unit:'U/L',   cvi:8.7,  cvg:30.6, ref:{hi:100,  note:'Upper limit'} },
  ast:          { name:'AST',               unit:'U/L',   cvi:11.9, cvg:23.3, ref:{hi:40,   note:'Upper limit'} },
  bicarbonate:  { name:'Bicarbonate (HCO₃)',unit:'mmol/L',cvi:3.0,  cvg:5.4,  ref:{lo:22,   hi:29,   note:'Reference interval'} },
  bilirubin:    { name:'Bilirubin (total)', unit:'µmol/L',cvi:21.8, cvg:43.3, ref:{lo:3,    hi:21,   note:'Reference interval'} },
  bilirubin_d:  { name:'Bilirubin (direct)',unit:'µmol/L',cvi:27.8, cvg:55.8, ref:{hi:5,    note:'Upper limit'} },
  calcium:      { name:'Calcium',           unit:'mmol/L',cvi:1.9,  cvg:2.8,  ref:{lo:2.15, hi:2.55, note:'Reference interval'} },
  chloride:     { name:'Chloride',          unit:'mmol/L',cvi:1.2,  cvg:1.5,  ref:{lo:98,   hi:107,  note:'Reference interval'} },
  cholesterol:  { name:'Cholesterol',       unit:'mmol/L',cvi:5.4,  cvg:15.4, ref:{hi:5.0,  note:'Cardiovascular risk cutoff'} },
  ck:           { name:'CK',                unit:'U/L',   cvi:22.8, cvg:40.5, ref:{hi:200,  note:'Upper limit (sex-dependent)'} },
  copper:       { name:'Copper',            unit:'µmol/L',cvi:5.6,  cvg:22.9, ref:{lo:11,   hi:22,   note:'Reference interval'} },
  creatinine:   { name:'Creatinine',        unit:'µmol/L',cvi:4.3,  cvg:14.2, ref:{lo:60,   hi:110,  note:'Reference interval (sex-dependent)'} },
  crp:          { name:'CRP',               unit:'mg/L',  cvi:42.7, cvg:76.3, ref:{hi:10,   note:'Upper limit (inflammation)'} },
  cystatin_c:   { name:'Cystatin C',        unit:'mg/L',  cvi:5.7,  cvg:13.0, ref:{lo:0.55, hi:0.96, note:'Reference interval'} },
  ferritin:     { name:'Ferritin',          unit:'µg/L',  cvi:14.2, cvg:27.5, ref:{lo:15,   hi:300,  note:'Reference interval (sex-dependent)'} },
  freet4:       { name:'Free T4',           unit:'pmol/L',cvi:7.4,  cvg:18.2, ref:{lo:10,   hi:22,   note:'Reference interval'} },
  freet3:       { name:'Free T3',           unit:'pmol/L',cvi:7.9,  cvg:21.4, ref:{lo:3.1,  hi:6.8,  note:'Reference interval'} },
  'ggt':        { name:'GGT',               unit:'U/L',   cvi:13.4, cvg:41.3, ref:{hi:55,   note:'Upper limit (sex-dependent)'} },
  glucose:      { name:'Glucose',           unit:'mmol/L',cvi:5.0,  cvg:7.5,  ref:{lo:3.9,  hi:6.1,  cutoff:7.0, note:'Fasting ref. interval; ≥7.0 = diabetes'} },
  hba1c:        { name:'HbA1c',             unit:'%',     cvi:1.9,  cvg:3.7,  ref:{hi:6.0,  cutoff:6.5, note:'Normal <6%; ≥6.5% = diabetes'} },
  hdl:          { name:'HDL cholesterol',   unit:'mmol/L',cvi:7.1,  cvg:19.7, ref:{lo:1.0,  note:'Lower limit (cardiovascular risk)'} },
  hemoglobin:   { name:'Hemoglobin',        unit:'g/dL',  cvi:1.5,  cvg:5.0,  ref:{lo:13.0, hi:17.0, note:'Men: 13–17; Women: 12–15.5 g/dL'} },
  iron:         { name:'Iron',              unit:'µmol/L',cvi:26.5, cvg:40.0, ref:{lo:10,   hi:30,   note:'Reference interval'} },
  lactate:      { name:'Lactate',           unit:'mmol/L',cvi:16.8, cvg:35.0, ref:{lo:0.5,  hi:2.0,  note:'Reference interval (venous)'} },
  ldh:          { name:'LDH',               unit:'U/L',   cvi:6.3,  cvg:14.5, ref:{hi:250,  note:'Upper limit'} },
  ldl:          { name:'LDL cholesterol',   unit:'mmol/L',cvi:8.3,  cvg:25.5, ref:{hi:3.0,  note:'Cardiovascular risk cutoff'} },
  lipase:       { name:'Lipase',            unit:'U/L',   cvi:11.5, cvg:33.0, ref:{hi:60,   note:'Upper limit'} },
  magnesium:    { name:'Magnesium',         unit:'mmol/L',cvi:3.6,  cvg:7.8,  ref:{lo:0.7,  hi:1.0,  note:'Reference interval'} },
  phosphate:    { name:'Phosphate',         unit:'mmol/L',cvi:8.4,  cvg:17.0, ref:{lo:0.8,  hi:1.5,  note:'Reference interval'} },
  potassium:    { name:'Potassium',         unit:'mmol/L',cvi:4.6,  cvg:5.6,  ref:{lo:3.5,  hi:5.0,  note:'Reference interval'} },
  protein:      { name:'Protein (total)',   unit:'g/L',   cvi:2.7,  cvg:4.0,  ref:{lo:60,   hi:80,   note:'Reference interval'} },
  sodium:       { name:'Sodium',            unit:'mmol/L',cvi:0.7,  cvg:1.0,  ref:{lo:136,  hi:145,  note:'Reference interval'} },
  transferrin:  { name:'Transferrin',       unit:'g/L',   cvi:3.4,  cvg:8.3,  ref:{lo:2.0,  hi:3.6,  note:'Reference interval'} },
  triglycerides:{ name:'Triglycerides',     unit:'mmol/L',cvi:20.9, cvg:37.5, ref:{hi:1.7,  note:'Cardiovascular risk cutoff'} },
  urea:         { name:'Urea',              unit:'mmol/L',cvi:12.3, cvg:18.8, ref:{lo:2.5,  hi:7.8,  note:'Reference interval'} },
  uricacid:     { name:'Uric acid',         unit:'µmol/L',cvi:8.8,  cvg:17.1, ref:{lo:200,  hi:430,  note:'Reference interval (sex-dependent)'} },
  zinc:         { name:'Zinc',              unit:'µmol/L',cvi:7.0,  cvg:15.4, ref:{lo:10,   hi:18,   note:'Reference interval'} },

  // ── Thyroid ─────────────────────────────────────────────────────────────
  tsh:          { name:'TSH',               unit:'mU/L',  cvi:20.7, cvg:41.6, ref:{lo:0.4,  hi:4.0,  note:'Reference interval'} },

  // ── Hormones ────────────────────────────────────────────────────────────
  cortisol:     { name:'Cortisol',          unit:'nmol/L',cvi:20.9, cvg:31.1, ref:{lo:170,  hi:700,  note:'Morning reference interval'} },
  estradiol:    { name:'Estradiol',         unit:'pmol/L',cvi:21.4, cvg:30.1, ref:{note:'Sex- and cycle-dependent'} },
  fsh:          { name:'FSH',               unit:'IU/L',  cvi:12.8, cvg:41.3, ref:{note:'Sex- and cycle-dependent'} },
  lh:           { name:'LH',               unit:'IU/L',  cvi:24.8, cvg:33.0, ref:{note:'Sex- and cycle-dependent'} },
  prolactin:    { name:'Prolactin',         unit:'mIU/L', cvi:24.0, cvg:42.5, ref:{note:'Sex-dependent'} },
  pth:          { name:'PTH',               unit:'pmol/L',cvi:25.0, cvg:17.9, ref:{lo:1.6,  hi:6.9,  note:'Reference interval'} },
  testosterone: { name:'Testosterone',      unit:'nmol/L',cvi:9.8,  cvg:28.9, ref:{note:'Sex-dependent'} },

  // ── Vitamins & micronutrients ────────────────────────────────────────────
  folate:       { name:'Folate',            unit:'nmol/L',cvi:20.0, cvg:41.1, ref:{lo:7.0,  note:'Lower limit'} },
  vitb12:       { name:'Vitamin B12',       unit:'pmol/L',cvi:9.5,  cvg:17.2, ref:{lo:148,  note:'Lower limit'} },
  vitd:         { name:'Vitamin D (25-OH)', unit:'nmol/L',cvi:10.6, cvg:26.4, ref:{lo:50,   note:'Sufficiency cutoff'} },

  // ── Coagulation ──────────────────────────────────────────────────────────
  aptt:         { name:'APTT',              unit:'s',     cvi:3.8,  cvg:8.1,  ref:{lo:25,   hi:38,   note:'Reference interval'} },
  fibrinogen:   { name:'Fibrinogen',        unit:'g/L',   cvi:10.5, cvg:18.1, ref:{lo:2.0,  hi:4.0,  note:'Reference interval'} },
  pt:           { name:'Prothrombin time',  unit:'s',     cvi:4.0,  cvg:6.9,  ref:{lo:11,   hi:14,   note:'Reference interval'} },

  // ── Tumour markers ───────────────────────────────────────────────────────
  afp:          { name:'AFP',               unit:'kIU/L', cvi:11.3, cvg:32.9, ref:{hi:10,   note:'Upper limit'} },
  ca125:        { name:'CA 125',            unit:'kIU/L', cvi:13.0, cvg:74.3, ref:{hi:35,   note:'Upper limit'} },
  ca199:        { name:'CA 19-9',           unit:'kIU/L', cvi:15.6, cvg:62.4, ref:{hi:37,   note:'Upper limit'} },
  cea:          { name:'CEA',               unit:'µg/L',  cvi:12.7, cvg:40.5, ref:{hi:5,    note:'Upper limit (non-smokers)'} },
  psa:          { name:'PSA (total)',        unit:'µg/L',  cvi:18.3, cvg:72.0, ref:{hi:4.0,  note:'Upper limit (age-dependent)'} },
};

function calcEFLMTiers(cvi, cvg) {
  const tiers = {};
  const factors = { optimal:{cv:0.25,bias:0.125}, desirable:{cv:0.5,bias:0.25}, minimum:{cv:0.75,bias:0.375} };
  for (const [tier, f] of Object.entries(factors)) {
    const cv   = f.cv   * cvi;
    const bias = f.bias * Math.sqrt(cvi*cvi + cvg*cvg);
    const tea  = bias + 1.65 * cv;
    tiers[tier] = { cv: +cv.toFixed(2), bias: +bias.toFixed(2), tea: +tea.toFixed(2) };
  }
  return tiers;
}

// Renders a compact summary bar inside the element with the given ID.
// Shows analyte name, unit, reference interval, and the applied tier specs.
function renderEFLMInfoBar(containerId, key, tier) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!key || typeof EFLM_DB === 'undefined' || !EFLM_DB[key]) { el.style.display = 'none'; return; }
  var a  = EFLM_DB[key];
  var tc = tier || 'desirable';
  var t  = calcEFLMTiers(a.cvi, a.cvg)[tc];
  var colors  = { optimal:'#059669', desirable:'#2563eb', minimum:'#d97706' };
  var bgs     = { optimal:'#ecfdf5', desirable:'#eff6ff', minimum:'#fffbeb' };
  var borders = { optimal:'#a7f3d0', desirable:'#bfdbfe', minimum:'#fde68a' };

  var refStr = '';
  if (a.ref) {
    if (a.ref.lo != null && a.ref.hi != null) refStr = a.ref.lo + '–' + a.ref.hi + ' ' + a.unit;
    else if (a.ref.hi != null) refStr = '< ' + a.ref.hi + ' ' + a.unit;
    else if (a.ref.lo != null) refStr = '> ' + a.ref.lo + ' ' + a.unit;
  }

  el.style.background   = bgs[tc];
  el.style.borderColor  = borders[tc];
  el.style.display      = 'block';
  el.innerHTML =
    '<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:6px;margin-bottom:4px;">' +
      '<strong style="font-size:13px;">' + a.name + '</strong>' +
      '<span style="color:#6b7280;font-size:12px;">' + a.unit + '</span>' +
      (refStr ? '<span style="color:#6b7280;font-size:12px;">· Ref: ' + refStr + '</span>' : '') +
      '<span style="color:#6b7280;font-size:12px;">· CV<sub>I</sub> ' + a.cvi + '% · CV<sub>G</sub> ' + a.cvg + '%</span>' +
      (function(){ var ii = (a.cvi / a.cvg).toFixed(2); return '<span style="color:#6b7280;font-size:12px;">· II ' + ii + (parseFloat(ii) < 0.6 ? ' <span style="color:#b45309;font-weight:600;">(personal baseline preferred)</span>' : '') + '</span>'; })() +
    '</div>' +
    '<div style="font-size:12px;color:' + colors[tc] + ';">' +
      '<strong>' + tc.charAt(0).toUpperCase() + tc.slice(1) + ':</strong> ' +
      'CV ≤ ' + t.cv + '% &nbsp;·&nbsp; Bias ≤ ' + t.bias + '% &nbsp;·&nbsp; TEa ≤ ' + t.tea + '%' +
    '</div>';
}

// ── Persistent analyte selection across tools ─────────────────────────────
// Call eflmPersistKey(key) when the user selects an analyte.
// Call eflmRestoreSelection(selectId) after building the dropdown.
var _EFLM_LS_KEY = 'eflm_last_analyte';

function eflmPersistKey(key) {
  try {
    if (key) localStorage.setItem(_EFLM_LS_KEY, key);
    else localStorage.removeItem(_EFLM_LS_KEY);
  } catch(e) {}
}

function eflmRestoreSelection(selectId) {
  try {
    var saved = localStorage.getItem(_EFLM_LS_KEY);
    if (!saved) return;
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.value = saved;
    if (sel.value === saved) sel.dispatchEvent(new Event('change'));
  } catch(e) {}
}

// Returns a clinically typical value for the selected analyte based on
// its reference interval: midpoint of lo+hi, or 60% of upper limit,
// or 150% of lower limit. Returns null if no reference data.
function eflmRefMean(key) {
  var a = EFLM_DB[key];
  if (!a || !a.ref) return null;
  var lo = a.ref.lo != null ? a.ref.lo : null;
  var hi = a.ref.hi != null ? a.ref.hi : null;
  if (lo !== null && hi !== null) return +((lo + hi) / 2).toFixed(3);
  if (hi !== null) return +(hi * 0.6).toFixed(3);
  if (lo !== null) return +(lo * 1.5).toFixed(3);
  return null;
}
