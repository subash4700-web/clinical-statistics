// ==========================================
// COMPLETE TWO WAY ANOVA (TABLE VERSION)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  applyTwoWayDims();
});

// ==========================================
// DIMENSIONS + TABLE
// ==========================================

function applyTwoWayDims() {
  const a = parseInt(document.getElementById("aLevels").value);
  const b = parseInt(document.getElementById("bLevels").value);

  generateLevelInputs("aNameInputs", a, "A");
  generateLevelInputs("bNameInputs", b, "B");

  generateDataTable();
}

function generateLevelInputs(containerId, count, prefix) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = prefix + (i + 1);
    container.appendChild(input);
  }
}

// ==========================================
// GENERATE DATA TABLE
// ==========================================

function generateDataTable() {
  const a = parseInt(document.getElementById("aLevels").value);
  const b = parseInt(document.getElementById("bLevels").value);
  const n = parseInt(document.getElementById("replicates").value);

  const totalRows = a * n;

  const container = document.getElementById("dataTableContainer");
  container.innerHTML = "";

  const table = document.createElement("table");
  table.id = "dataTable";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headerRow.appendChild(document.createElement("th"));

  for (let j = 0; j < b; j++) {
    const th = document.createElement("th");
    th.textContent = "B" + (j + 1);
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (let i = 0; i < totalRows; i++) {
    const tr = document.createElement("tr");

    const label = document.createElement("td");
    label.textContent = "Row " + (i + 1);
    tr.appendChild(label);

    for (let j = 0; j < b; j++) {
      const td = document.createElement("td");
      td.contentEditable = true;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  container.appendChild(table);

  enableExcelPaste(table);
}

// ==========================================
// EXCEL PASTE
// ==========================================

function enableExcelPaste(table) {
  table.addEventListener("paste", function (e) {
    e.preventDefault();

    const paste = (e.clipboardData || window.clipboardData).getData("text");
    const rows = paste.split(/\r?\n/).filter(r => r.trim() !== "");

    const startCell = document.activeElement;
    if (!startCell || startCell.tagName !== "TD") return;

    const startRow = startCell.parentElement.rowIndex - 1;
    const startCol = startCell.cellIndex - 1;

    rows.forEach((row, i) => {
      const cells = row.split(/\t/);

      cells.forEach((value, j) => {
        const r = startRow + i;
        const c = startCol + j;

        if (table.rows[r + 1] && table.rows[r + 1].cells[c + 1]) {
          table.rows[r + 1].cells[c + 1].textContent = value.replace(",", ".");
        }
      });
    });
  });
}

// ==========================================
// READ MATRIX
// ==========================================

function getMatrixFromTable() {
  const table = document.getElementById("dataTable");
  const matrix = [];

  for (let i = 1; i < table.rows.length; i++) {
    const row = [];
    for (let j = 1; j < table.rows[i].cells.length; j++) {
      const value = parseFloat(table.rows[i].cells[j].textContent);
      row.push(isNaN(value) ? 0 : value);
    }
    matrix.push(row);
  }

  return matrix;
}

// ==========================================
// RUN TWO WAY ANOVA
// ==========================================

function runTwoWayANOVA() {
  const matrix = getMatrixFromTable();

  const a = parseInt(document.getElementById("aLevels").value);
  const b = parseInt(document.getElementById("bLevels").value);
  const n = parseInt(document.getElementById("replicates").value);
  const mode = document.getElementById("mode").value;

  const alpha = parseFloat(document.getElementById("alpha").value);
  const resultsDiv = document.getElementById("results");

  const N = a * b * n;

  const flat = matrix.flat();
  const grandMean = mean(flat);

  // === Means
  const meanA = [];
  const meanB = [];
  const meanCell = [];

  for (let i = 0; i < a; i++) {
    let vals = [];
    for (let r = 0; r < n; r++) {
      vals = vals.concat(matrix[i * n + r]);
    }
    meanA.push(mean(vals));
  }

  for (let j = 0; j < b; j++) {
    let vals = [];
    for (let i = 0; i < a * n; i++) {
      vals.push(matrix[i][j]);
    }
    meanB.push(mean(vals));
  }

  for (let i = 0; i < a; i++) {
    meanCell[i] = [];
    for (let j = 0; j < b; j++) {
      let vals = [];
      for (let r = 0; r < n; r++) {
        vals.push(matrix[i * n + r][j]);
      }
      meanCell[i][j] = mean(vals);
    }
  }

  // === Sum of Squares
  let SSA = 0, SSB = 0, SSAB = 0, SSE = 0, SST = 0;

  for (let i = 0; i < a; i++)
    SSA += b * n * Math.pow(meanA[i] - grandMean, 2);

  for (let j = 0; j < b; j++)
    SSB += a * n * Math.pow(meanB[j] - grandMean, 2);

  if (mode === "with_replication") {
    for (let i = 0; i < a; i++)
      for (let j = 0; j < b; j++)
        SSAB += n * Math.pow(
          meanCell[i][j] - meanA[i] - meanB[j] + grandMean, 2);

    for (let i = 0; i < a; i++)
      for (let j = 0; j < b; j++)
        for (let r = 0; r < n; r++)
          SSE += Math.pow(
            matrix[i * n + r][j] - meanCell[i][j], 2);
  }

  for (let val of flat)
    SST += Math.pow(val - grandMean, 2);

  if (mode === "without_replication") {
    SSE = SST - SSA - SSB;
  }

  // === Degrees of Freedom
  const dfA = a - 1;
  const dfB = b - 1;
  const dfAB = (a - 1) * (b - 1);
  const dfE = mode === "with_replication"
    ? a * b * (n - 1)
    : dfAB;

  const MSA = SSA / dfA;
  const MSB = SSB / dfB;
  const MSAB = mode === "with_replication" ? SSAB / dfAB : null;
  const MSE = SSE / dfE;

  const FA = MSA / MSE;
  const FB = MSB / MSE;
  const FAB = mode === "with_replication" ? MSAB / MSE : null;

  const pA = 1 - jStat.centralF.cdf(FA, dfA, dfE);
  const pB = 1 - jStat.centralF.cdf(FB, dfB, dfE);
  const pAB = mode === "with_replication"
    ? 1 - jStat.centralF.cdf(FAB, dfAB, dfE)
    : null;

  // === OUTPUT
  resultsDiv.innerHTML = `
    <table>
      <tr>
        <th>Source</th><th>SS</th><th>df</th>
        <th>MS</th><th>F</th><th>p-value</th>
      </tr>
      <tr>
        <td>Factor A</td>
        <td>${SSA.toFixed(4)}</td>
        <td>${dfA}</td>
        <td>${MSA.toFixed(4)}</td>
        <td>${FA.toFixed(4)}</td>
        <td>${pA.toFixed(4)}</td>
      </tr>
      <tr>
        <td>Factor B</td>
        <td>${SSB.toFixed(4)}</td>
        <td>${dfB}</td>
        <td>${MSB.toFixed(4)}</td>
        <td>${FB.toFixed(4)}</td>
        <td>${pB.toFixed(4)}</td>
      </tr>
      ${mode === "with_replication" ? `
      <tr>
        <td>Interaction</td>
        <td>${SSAB.toFixed(4)}</td>
        <td>${dfAB}</td>
        <td>${MSAB.toFixed(4)}</td>
        <td>${FAB.toFixed(4)}</td>
        <td>${pAB.toFixed(4)}</td>
      </tr>` : ""}
      <tr>
        <td>Error</td>
        <td>${SSE.toFixed(4)}</td>
        <td>${dfE}</td>
        <td>${MSE.toFixed(4)}</td>
        <td>-</td>
        <td>-</td>
      </tr>
    </table>
  `;
}

// ==========================================
// HELPERS
// ==========================================

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
