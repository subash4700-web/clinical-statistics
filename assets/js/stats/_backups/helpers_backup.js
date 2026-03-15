

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
