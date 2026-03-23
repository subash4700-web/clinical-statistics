// ── EFLM biological variation database (Ricos et al. 2014) ──
// ref: { lo, hi, cutoff } — lo/hi = reference interval, cutoff = clinical decision threshold
// Shared by method_comparison.html and precision_ep05.html

const EFLM_DB = {
  albumin:      { name:'Albumin',           unit:'g/L',   cvi:3.1,  cvg:4.2,  ref:{lo:35,   hi:50,   note:'Reference interval'} },
  alp:          { name:'ALP',               unit:'U/L',   cvi:6.4,  cvg:26.1, ref:{hi:130,  note:'Upper limit'} },
  alt:          { name:'ALT',               unit:'U/L',   cvi:18.3, cvg:41.6, ref:{hi:45,   note:'Upper limit (sex-dependent)'} },
  amylase:      { name:'Amylase',           unit:'U/L',   cvi:8.7,  cvg:30.6, ref:{hi:100,  note:'Upper limit'} },
  ast:          { name:'AST',               unit:'U/L',   cvi:11.9, cvg:23.3, ref:{hi:40,   note:'Upper limit'} },
  bilirubin:    { name:'Bilirubin (total)', unit:'µmol/L',cvi:21.8, cvg:43.3, ref:{lo:3,    hi:21,   note:'Reference interval'} },
  calcium:      { name:'Calcium',           unit:'mmol/L',cvi:1.9,  cvg:2.8,  ref:{lo:2.15, hi:2.55, note:'Reference interval'} },
  chloride:     { name:'Chloride',          unit:'mmol/L',cvi:1.2,  cvg:1.5,  ref:{lo:98,   hi:107,  note:'Reference interval'} },
  cholesterol:  { name:'Cholesterol',       unit:'mmol/L',cvi:5.4,  cvg:15.4, ref:{hi:5.0,  note:'Cardiovascular risk cutoff'} },
  ck:           { name:'CK',                unit:'U/L',   cvi:22.8, cvg:40.5, ref:{hi:200,  note:'Upper limit (sex-dependent)'} },
  creatinine:   { name:'Creatinine',        unit:'µmol/L',cvi:4.3,  cvg:14.2, ref:{lo:60,   hi:110,  note:'Reference interval (sex-dependent)'} },
  crp:          { name:'CRP',               unit:'mg/L',  cvi:42.7, cvg:76.3, ref:{hi:10,   note:'Upper limit (inflammation)'} },
  ferritin:     { name:'Ferritin',          unit:'µg/L',  cvi:14.2, cvg:27.5, ref:{lo:15,   hi:300,  note:'Reference interval (sex-dependent)'} },
  freet4:       { name:'Free T4',           unit:'pmol/L',cvi:7.4,  cvg:18.2, ref:{lo:10,   hi:22,   note:'Reference interval'} },
  'ggt':        { name:'GGT',               unit:'U/L',   cvi:13.4, cvg:41.3, ref:{hi:55,   note:'Upper limit (sex-dependent)'} },
  glucose:      { name:'Glucose',           unit:'mmol/L',cvi:5.0,  cvg:7.5,  ref:{lo:3.9,  hi:6.1,  cutoff:7.0, note:'Fasting ref. interval; ≥7.0 = diabetes'} },
  hba1c:        { name:'HbA1c',             unit:'%',     cvi:1.9,  cvg:3.7,  ref:{hi:6.0,  cutoff:6.5, note:'Normal <6%; ≥6.5% = diabetes'} },
  hdl:          { name:'HDL cholesterol',   unit:'mmol/L',cvi:7.1,  cvg:19.7, ref:{lo:1.0,  note:'Lower limit (cardiovascular risk)'} },
  hemoglobin:   { name:'Hemoglobin',        unit:'g/dL',  cvi:1.5,  cvg:5.0,  ref:{lo:13.0, hi:17.0, note:'Men: 13–17; Women: 12–15.5 g/dL'} },
  iron:         { name:'Iron',              unit:'µmol/L',cvi:26.5, cvg:40.0, ref:{lo:10,   hi:30,   note:'Reference interval'} },
  ldh:          { name:'LDH',               unit:'U/L',   cvi:6.3,  cvg:14.5, ref:{hi:250,  note:'Upper limit'} },
  ldl:          { name:'LDL cholesterol',   unit:'mmol/L',cvi:8.3,  cvg:25.5, ref:{hi:3.0,  note:'Cardiovascular risk cutoff'} },
  magnesium:    { name:'Magnesium',         unit:'mmol/L',cvi:3.6,  cvg:7.8,  ref:{lo:0.7,  hi:1.0,  note:'Reference interval'} },
  phosphate:    { name:'Phosphate',         unit:'mmol/L',cvi:8.4,  cvg:17.0, ref:{lo:0.8,  hi:1.5,  note:'Reference interval'} },
  potassium:    { name:'Potassium',         unit:'mmol/L',cvi:4.6,  cvg:5.6,  ref:{lo:3.5,  hi:5.0,  note:'Reference interval'} },
  protein:      { name:'Protein (total)',   unit:'g/L',   cvi:2.7,  cvg:4.0,  ref:{lo:60,   hi:80,   note:'Reference interval'} },
  sodium:       { name:'Sodium',            unit:'mmol/L',cvi:0.7,  cvg:1.0,  ref:{lo:136,  hi:145,  note:'Reference interval'} },
  triglycerides:{ name:'Triglycerides',     unit:'mmol/L',cvi:20.9, cvg:37.5, ref:{hi:1.7,  note:'Cardiovascular risk cutoff'} },
  tsh:          { name:'TSH',               unit:'mU/L',  cvi:20.7, cvg:41.6, ref:{lo:0.4,  hi:4.0,  note:'Reference interval'} },
  urea:         { name:'Urea',              unit:'mmol/L',cvi:12.3, cvg:18.8, ref:{lo:2.5,  hi:7.8,  note:'Reference interval'} },
  uricacid:     { name:'Uric acid',         unit:'µmol/L',cvi:8.8,  cvg:17.1, ref:{lo:200,  hi:430,  note:'Reference interval (sex-dependent)'} },
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
