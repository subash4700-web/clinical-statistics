function parseInput(text) {
    return text
        .split(/[\s,;]+/)
        .map(Number)
        .filter(x => !isNaN(x));
}

function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr, m) {
    return arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
}

function runTwoSampleTTest() {

    const group1Text = document.getElementById("group1")?.value || "";
    const group2Text = document.getElementById("group2")?.value || "";

    const group1 = parseInput(group1Text);
    const group2 = parseInput(group2Text);

    if (group1.length < 2 || group2.length < 2) {
        alert("Each group must contain at least 2 numeric values.");
        return;
    }

    const alpha = parseFloat(document.getElementById("alpha")?.value || 0.05);
    const testType = document.getElementById("testType")?.value || "two-sided";
    const varianceType = document.getElementById("varianceType")?.value || "pooled";
    const showEffect = document.getElementById("showEffect")?.checked || false;

    const n1 = group1.length;
    const n2 = group2.length;

    const mean1 = mean(group1);
    const mean2 = mean(group2);

    const var1 = variance(group1, mean1);
    const var2 = variance(group2, mean2);

    let t, df, se;

    if (varianceType === "pooled") {

        const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
        se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
        t = (mean1 - mean2) / se;
        df = n1 + n2 - 2;

    } else {

        se = Math.sqrt(var1 / n1 + var2 / n2);
        t = (mean1 - mean2) / se;

        df = Math.pow(var1 / n1 + var2 / n2, 2) /
            ((Math.pow(var1 / n1, 2) / (n1 - 1)) +
             (Math.pow(var2 / n2, 2) / (n2 - 1)));
    }

    let p;

    if (testType === "two-sided") {
        p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    } else if (testType === "greater") {
        p = 1 - jStat.studentt.cdf(t, df);
    } else {
        p = jStat.studentt.cdf(t, df);
    }

    const tCritical = jStat.studentt.inv(1 - alpha / 2, df);
    const ciLower = (mean1 - mean2) - tCritical * se;
    const ciUpper = (mean1 - mean2) + tCritical * se;

    let effectText = "";

    if (showEffect) {
        const pooledSD = Math.sqrt(
            ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
        );
        const d = (mean1 - mean2) / pooledSD;
        effectText = `<p><strong>Cohen's d:</strong> ${d.toFixed(4)}</p>`;
    }

    const resultsDiv = document.getElementById("results");

    resultsDiv.innerHTML = `
        <h3>Results</h3>
        <p><strong>Mean 1:</strong> ${mean1.toFixed(4)}</p>
        <p><strong>Mean 2:</strong> ${mean2.toFixed(4)}</p>
        <p><strong>Difference:</strong> ${(mean1 - mean2).toFixed(4)}</p>
        <p><strong>t-statistic:</strong> ${t.toFixed(4)}</p>
        <p><strong>Degrees of freedom:</strong> ${df.toFixed(4)}</p>
        <p><strong>p-value:</strong> ${p.toFixed(6)}</p>
        <p><strong>${(1 - alpha) * 100}% CI:</strong> [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}]</p>
        ${effectText}
    `;
}
