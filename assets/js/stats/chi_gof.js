/* =========================
   Chi-square: Goodness of Fit
   ========================= */

document.addEventListener("DOMContentLoaded", () => {

  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  function activateTab(tabId) {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
    document.getElementById(tabId).classList.add("active");
  }

  document.getElementById("runBtn").addEventListener("click", () => {

    const obs = [o1.valueAsNumber, o2.valueAsNumber, o3.valueAsNumber];
    const prop = [p1.valueAsNumber, p2.valueAsNumber, p3.valueAsNumber];

    const n = obs.reduce((a,b) => a + b, 0);
    let html = "<h3>Results</h3>";

    if (n === 0) {
      html += `<div class="warn">Total sample size is zero.</div>`;
      results.innerHTML = html;
      activateTab("analysis");
      return;
    }

    let chi2 = 0;
    for (let i = 0; i < obs.length; i++) {
      const exp = n * prop[i];
      chi2 += (obs[i] - exp) ** 2 / exp;
    }

    const df = obs.length - 1;
    const p = 1 - Math.exp(-0.5 * chi2); // approx for df>1

    html += `
      <p><b>χ²(${df}):</b> ${fmt(chi2, 3)}</p>
      <p><b>p-value (approx):</b> ${fmt(p, 4)}</p>
      <p><b>Interpretation:</b> ${p < 0.05 ? "Reject H₀" : "Fail to reject H₀"}</p>
    `;

    results.innerHTML = html;
    activateTab("analysis");
  });

});
