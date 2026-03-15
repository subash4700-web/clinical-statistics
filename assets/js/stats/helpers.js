

function erf(x){
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741,
        a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const t=1/(1+p*x);
  const y=1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x));
  return sign*y;
}

function erfc(x){
  return 1 - erf(x);
}

function chi2_p_df1(x){
  return erfc(Math.sqrt(x/2));
}

function fmt(x, d=4){
  return Number.isFinite(x) ? x.toFixed(d) : "NaN";
}

function inverseNormal(p){
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

// ======================
// Basic Descriptive Stats
// ======================

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  const m = mean(arr);
  return arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1);
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}


function mean(arr) {
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function variance(arr) {
  const m = mean(arr);
  return arr.reduce((a,b)=>a+(b-m)**2,0)/(arr.length-1);
}

