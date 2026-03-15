function runANOVA() {

  const raw = document.getElementById("dataInput").value.trim();
  const alpha = parseFloat(document.getElementById("alpha").value);
  const showEffect = document.getElementById("showEffect").checked;

  if (!raw) {
    alert("Please enter numeric data.");
    return;
  }

  /* -------- Parse numeric matrix -------- */
  const rows = raw.split("\n")
    .map(r => r.trim())
    .filter(r => r.length > 0)
    .map(r => r.split(/[\s,;]+/).map(Number));

  const k = rows[0].length;

  let groups = Array.from({ length: k }, () => []);

  for (const row of rows) {
    for (let j = 0; j < k; j++) {
      if (!isNaN(row[j])) {
        groups[j].push(row[j]);
      }
    }
  }

  /* -------- Read group names separately -------- */
  const nameInputs = document.querySelectorAll("#groupNameInputs input");
  const groupNames = Array.from(nameInputs).map(
    (el, i) => el.value || `Group ${i+1}`
  );

  const Ns = groups.map(g => g.length);
  const means = groups.map(g => mean(g));
  const variances = groups.map(g => variance(g));

  const N = Ns.reduce((a,b)=>a+b,0);
  const grandMean = mean(groups.flat());

  let SS_between = 0;
  for (let i = 0; i < k; i++) {
    SS_between += Ns[i] * Math.pow(means[i] - grandMean, 2);
  }

  let SS_within = 0;
  for (let i = 0; i < k; i++) {
    for (let x of groups[i]) {
      SS_within += Math.pow(x - means[i], 2);
    }
  }

  const SS_total = SS_between + SS_within;

  const df_between = k - 1;
  const df_within = N - k;
  const df_total = N - 1;

  const MS_between = SS_between / df_between;
  const MS_within = SS_within / df_within;

  const F = MS_between / MS_within;

  const p = 1 - jStat.centralF.cdf(F, df_between, df_within);
  const Fcrit = jStat.centralF.inv(1 - alpha, df_between, df_within);

  const eta2 = SS_between / SS_total;

  let html = `<h2>Summary</h2>
  <table>
    <tr><th>Group</th><th>N</th><th>Mean</th><th>Variance</th></tr>`;

  for (let i = 0; i < k; i++) {
    html += `<tr>
      <td>${groupNames[i]}</td>
      <td>${Ns[i]}</td>
      <td>${means[i].toFixed(4)}</td>
      <td>${variances[i].toFixed(4)}</td>
    </tr>`;
  }

  html += `</table>`;

  html += `<h2>ANOVA Table</h2>
  <table>
  <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p-value</th><th>F crit</th></tr>
  <tr>
    <td>Between Groups</td>
    <td>${SS_between.toFixed(4)}</td>
    <td>${df_between}</td>
    <td>${MS_between.toFixed(4)}</td>
    <td>${F.toFixed(4)}</td>
    <td>${p.toExponential(4)}</td>
    <td>${Fcrit.toFixed(4)}</td>
  </tr>
  <tr>
    <td>Within Groups</td>
    <td>${SS_within.toFixed(4)}</td>
    <td>${df_within}</td>
    <td>${MS_within.toFixed(4)}</td>
    <td></td><td></td><td></td>
  </tr>
  <tr>
    <td>Total</td>
    <td>${SS_total.toFixed(4)}</td>
    <td>${df_total}</td>
    <td></td><td></td><td></td><td></td>
  </tr>
  </table>`;

  if (showEffect) {
    html += `<h3>Effect Size</h3>
    <p>η² = ${eta2.toFixed(4)}</p>`;
  }

  html += `<h3>Decision</h3>
  <p>${p < alpha ? 
      "<strong>Reject H₀</strong>: At least one group mean differs." :
      "Fail to reject H₀: No significant difference detected."
  }</p>`;

  document.getElementById("results").innerHTML = html;
}

/* =========================
   Dynamic Group Management
   ========================= */

function addGroup() {
  const container = document.getElementById("groupNameInputs");
  const count = container.children.length + 1;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Group " + count;
  input.value = "Group " + count;
  input.style.padding = "6px";
  input.style.width = "100%";

  container.appendChild(input);
}

function removeGroup() {
  const container = document.getElementById("groupNameInputs");
  if (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }
}

/* Initialize groups when page fully loads */
window.addEventListener("load", function() {
  const container = document.getElementById("groupNameInputs");
  if (container && container.children.length === 0) {
    for (let i = 0; i < 3; i++) {
      addGroup();
    }
  }
});

