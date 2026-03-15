/* =========================
   Chi-square: Independence
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

    const n11 = document.getElementById("o11").valueAsNumber;
    const n12 = document.getElementById("o12").valueAsNumber;
    const n21 = document.getElementById("o21").valueAsNumber;
    const n22 = document.getElementById("o22").valueAsNumber;

    const n = n11 + n12 + n21 + n22;
    let html = "<h3>Results</h3>";

    if (!Number.isFinite(n) || n === 0) {
      html += `<div class="warn">Please enter valid observed counts.</div>`;
      results.innerHTML = html;
      activateTab("analysis");
      return;
    }

    const r1 = n11 + n12;
    const r2 = n21 + n22;
    const c1 = n11 + n21;
    const c2 = n12 + n22;

    const e11 = r1 * c1 / n;
    const e12 = r1 * c2 / n;
    const e21 = r2 * c1 / n;
    const e22 = r2 * c2 / n;

    const chi2 =
      (n11 - e11) ** 2 / e11 +
      (n12 - e12) ** 2 / e12 +
      (n21 - e21) ** 2 / e21 +
      (n22 - e22) ** 2 / e22;

    const p = chi2_p_df1(chi2);

    html += `
      <p><b>χ²(1):</b> ${fmt(chi2, 3)}</p>
      <p><b>p-value:</b> ${fmt(p, 4)}</p>
      <p><b>Interpretation:</b> ${p < 0.05 ? "Reject H₀ (association present)" : "Fail to reject H₀"}</p>
    `;

    results.innerHTML = html;
    activateTab("analysis");
  });

});
