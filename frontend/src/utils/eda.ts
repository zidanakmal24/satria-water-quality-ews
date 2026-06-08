import type { EdaRecord } from "../types";
import { escapeHtml } from "./format";

export type ComputedEdaStats = {
  rows: number;
  features: number;
  missingPct: number;
  avgPh: number;
  tempMean: number;
  doMean: number;
  ammoniaMean: number;
  nitriteMean: number;
};

const fieldAliases = {
  ph: ["ph", "pH"],
  temperature: ["temperature", "temperature_c"],
  dissolvedOxygen: ["dissolved_oxygen_mg_l", "do"],
  ammonia: ["ammonia_mg_l_1", "ammonia_mg_l", "ammonia"],
  nitrite: ["nitrite_mg_l_1", "nitrite_mg_l", "nitrite"],
} as const;

const waterQualityParams = [
  { key: "temperature", label: "Temperature", unit: "°C", type: "numeric" },
  { key: "ph", label: "pH", unit: "", type: "numeric" },
  { key: "dissolved_oxygen_mg_l", label: "Dissolved Oxygen", unit: "mg/L", type: "numeric" },
  { key: "ammonia_mg_l_1", label: "Ammonia", unit: "mg/L", type: "numeric" },
  { key: "nitrite_mg_l_1", label: "Nitrite", unit: "mg/L", type: "numeric" },
  { key: "phosphorus_mg_l_1", label: "Phosphorus", unit: "mg/L", type: "numeric" },
  { key: "hydrogen_sulfide_mg_l_1", label: "Hydrogen Sulfide", unit: "mg/L", type: "numeric" },
  { key: "turbidity_cm", label: "Turbidity", unit: "cm", type: "numeric" },
  { key: "carbon_dioxide_mg_l_1", label: "CO₂", unit: "mg/L", type: "numeric" },
  { key: "biochemical_oxygen_demand_mg_l", label: "BOD", unit: "mg/L", type: "numeric" },
  { key: "total_alkalinity_mg_l_1", label: "Total Alkalinity", unit: "mg/L", type: "numeric" },
  { key: "total_hardness_mg_l_1", label: "Total Hardness", unit: "mg/L", type: "numeric" },
  { key: "calcium_mg_l_1", label: "Calcium", unit: "mg/L", type: "numeric" },
  { key: "plankton_count_no_l_1", label: "Plankton Count", unit: "No/L", type: "numeric" },
  { key: "aquaculture_suitability_tier", label: "Suitability Tier", unit: "", type: "categorical" },
];

function mean(values: number[]): number {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
}

function getNumericColumn(
  rows: EdaRecord[],
  candidates: string[]
): number[] {
  const values: number[] = [];

  for (const row of rows) {
    for (const key of candidates) {
      if (!(key in row)) continue;

      const num = Number(row[key]);

      if (Number.isFinite(num)) {
        values.push(num);
      }

      break;
    }
  }

  return values;
}

function pearsonCorrelation(a: number[], b: number[]): number {
  if (a.length < 2 || a.length !== b.length) return 0;
  
  const meanA = mean(a);
  const meanB = mean(b);
  
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const diffA = a[i] - meanA;
    const diffB = b[i] - meanB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }
  
  const denominator = Math.sqrt(denomA * denomB);
  return denominator === 0 ? 0 : numerator / denominator;
}

function getPercentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(sorted.length * pct) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function computeEdaStats(
  rows: EdaRecord[]
): ComputedEdaStats {
  const columns =
    rows.length > 0 ? Object.keys(rows[0]) : [];

  let missing = 0;

  rows.forEach((row) => {
    Object.values(row).forEach((value) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        missing++;
      }
    });
  });

  const totalCells =
    rows.length * Math.max(columns.length, 1);

  return {
    rows: rows.length,
    features: columns.length,

    missingPct:
      totalCells === 0
        ? 0
        : (missing / totalCells) * 100,

    avgPh: mean(
      getNumericColumn(rows, [...fieldAliases.ph])
    ),

    tempMean: mean(
      getNumericColumn(rows, [...fieldAliases.temperature])
    ),

    doMean: mean(
      getNumericColumn(rows, [...fieldAliases.dissolvedOxygen])
    ),

    ammoniaMean: mean(
      getNumericColumn(rows, [...fieldAliases.ammonia])
    ),

    nitriteMean: mean(
      getNumericColumn(rows, [...fieldAliases.nitrite])
    ),
  };
}

export function renderDataInfoTable(rows: EdaRecord[]): string {
  if (rows.length === 0) return `<div class="empty-chart"><strong>Belum ada data</strong></div>`;
  
  const firstRow = rows[0];
  const columns = Object.keys(firstRow);
  const totalCells = rows.length * columns.length;
  
  let totalMissing = 0;
  const missingPerColumn: Record<string, number> = {};
  
  columns.forEach(col => {
    missingPerColumn[col] = 0;
  });
  
  rows.forEach((row) => {
    columns.forEach(col => {
      const value = row[col];
      if (value === null || value === undefined || value === "") {
        missingPerColumn[col]++;
        totalMissing++;
      }
    });
  });
  
  const missingPct = totalMissing === 0 ? 0 : (totalMissing / totalCells) * 100;
  
  return `
    <div class="eda-section">
      <h3>Dataset Overview</h3>
      <div class="info-grid">
        <div class="info-card">
          <span class="label">Rows</span>
          <span class="value">${rows.length}</span>
        </div>
        <div class="info-card">
          <span class="label">Columns</span>
          <span class="value">${columns.length}</span>
        </div>
        <div class="info-card">
          <span class="label">Missing Values</span>
          <span class="value">${totalMissing}</span>
        </div>
        <div class="info-card">
          <span class="label">Missing %</span>
          <span class="value">${missingPct.toFixed(2)}%</span>
        </div>
      </div>
      
      <h3 style="margin-top: 1.5rem;">Missing Values Per Column</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Column</th>
            <th>Data Type</th>
            <th>Missing Count</th>
            <th>Missing %</th>
            <th>Non-Null</th>
          </tr>
        </thead>
        <tbody>
          ${columns.map(col => {
            const missing = missingPerColumn[col];
            const nonNull = rows.length - missing;
            const missingPct = missing === 0 ? 0 : (missing / rows.length) * 100;
            
            let dataType = "object";
            const sampleValue = rows.find(r => r[col] != null)?.[col];
            if (typeof sampleValue === "number") dataType = "numeric";
            else if (typeof sampleValue === "boolean") dataType = "boolean";
            else if (!isNaN(Number(sampleValue))) dataType = "numeric";
            
            return `
              <tr>
                <td>${escapeHtml(col)}</td>
                <td><span class="badge">${dataType}</span></td>
                <td>${missing}</td>
                <td>${missingPct.toFixed(1)}%</td>
                <td><strong>${nonNull}</strong></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderCorrelationHeatmap(rows: EdaRecord[]): string {
  const numericKeys = waterQualityParams
    .filter(p => p.type === "numeric" && p.key !== "aquaculture_suitability_tier")
    .map(p => p.key)
    .slice(0, 8);
  
  const correlations: Record<string, Record<string, number>> = {};
  const columnData: Record<string, number[]> = {};
  
  numericKeys.forEach(key => {
    columnData[key] = [];
    rows.forEach(row => {
      const val = Number(row[key]);
      if (Number.isFinite(val)) {
        columnData[key].push(val);
      }
    });
  });
  
  numericKeys.forEach(key1 => {
    correlations[key1] = {};
    numericKeys.forEach(key2 => {
      if (key1 === key2) {
        correlations[key1][key2] = 1;
      } else {
        correlations[key1][key2] = pearsonCorrelation(columnData[key1], columnData[key2]);
      }
    });
  });
  
  const labels = numericKeys.map(k => waterQualityParams.find(p => p.key === k)?.label || k);
  
  return `
    <div class="eda-section">
      <h3>Correlation Matrix</h3>
      <p class="chart-help">Nilai mendekati 1 berarti korelasi positif kuat, -1 berarti korelasi negatif kuat, 0 berarti tidak ada korelasi.</p>
      <div class="correlation-heatmap">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th></th>
              ${labels.map(l => `<th title="${l}" class="rotate"><span>${l}</span></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${numericKeys.map((key1, i) => `
              <tr>
                <th>${labels[i]}</th>
                ${numericKeys.map(key2 => {
                  const corr = correlations[key1][key2];
                  const intensity = Math.abs(corr);
                  const bgColor = corr > 0 ? `rgba(31, 119, 180, ${intensity})` : `rgba(255, 127, 14, ${intensity})`;
                  return `<td style="background-color: ${bgColor}; color: ${intensity > 0.6 ? "white" : "black"};"><strong>${corr.toFixed(2)}</strong></td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderPhDistribution(rows: EdaRecord[]): string {
  const phValues = getNumericColumn(rows, [...fieldAliases.ph]);
  
  if (phValues.length === 0) {
    return `<div class="empty-chart"><strong>Belum ada data pH</strong></div>`;
  }
  
  const bins: Record<number, number> = {};
  const binSize = 0.5;
  
  phValues.forEach(val => {
    const binKey = Math.floor(val / binSize) * binSize;
    bins[binKey] = (bins[binKey] || 0) + 1;
  });
  
  const sortedBins = Object.entries(bins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  
  const maxCount = Math.max(...sortedBins.map(b => b[1]));
  
  return `
    <div class="eda-section">
      <h3>pH Distribution (Top 12)</h3>
      <p class="chart-help">Distribusi pH dari yang paling tinggi frekuensi ke terendah.</p>
      <div class="ph-distribution-bars">
        ${sortedBins.map(([binKey, count]) => {
          const percentage = (count / phValues.length) * 100;
          const height = (count / maxCount) * 100;
          return `
            <div class="ph-bar-item">
              <div class="bar-label">${parseFloat(binKey).toFixed(1)}</div>
              <div class="bar-container">
                <div class="bar" style="height: ${height}%;" title="${count} samples (${percentage.toFixed(1)}%)"></div>
              </div>
              <div class="bar-count">${count}</div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function renderOutlierAnalysis(rows: EdaRecord[]): string {
  const numericParams = waterQualityParams.filter(p => p.type === "numeric" && p.key !== "aquaculture_suitability_tier").slice(0, 6);
  
  let maxOutliers = 0;
  let maxParam = "";
  
  return `
    <div class="eda-section">
      <h3>Outlier Detection (IQR Method)</h3>
      <p class="chart-help">Outlier terdeteksi menggunakan Interquartile Range (IQR). Nilai di luar Q1 - 1.5×IQR dan Q3 + 1.5×IQR dianggap outlier.</p>
      <div class="outlier-grid">
        ${numericParams.map(param => {
          const values = getNumericColumn(rows, [param.key]).sort((a, b) => a - b);
          if (values.length === 0) return "";
          
          const q1 = getPercentile(values, 0.25);
          const q3 = getPercentile(values, 0.75);
          const iqr = q3 - q1;
          const lower = q1 - 1.5 * iqr;
          const upper = q3 + 1.5 * iqr;
          
          const outliers = values.filter(v => v < lower || v > upper);
          const outlierCount = outliers.length;
          
          if (outlierCount > maxOutliers) {
            maxOutliers = outlierCount;
            maxParam = param.label;
          }
          
          return `
            <div class="outlier-card">
              <h4>${param.label}</h4>
              <div class="outlier-stats">
                <div><span>Q1:</span> ${q1.toFixed(2)}</div>
                <div><span>Q3:</span> ${q3.toFixed(2)}</div>
                <div><span>IQR:</span> ${iqr.toFixed(2)}</div>
                <div><span>Range:</span> [${lower.toFixed(2)}, ${upper.toFixed(2)}]</div>
                <div class="outlier-count"><span>Outliers:</span> <strong>${outlierCount}</strong> (${((outlierCount/values.length)*100).toFixed(1)}%)</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
      ${maxOutliers > 0 ? `<p class="outlier-note" style="margin-top: 1rem;">Parameter dengan outlier terbanyak: <strong>${maxParam}</strong> (${maxOutliers} data)</p>` : ""}
    </div>
  `;
}

export function renderClassDistribution(rows: EdaRecord[]): string {
  const tierCounts: Record<string, number> = {};
  
  rows.forEach(row => {
    const tier = String(row.aquaculture_suitability_tier || "Unknown");
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  });
  
  const total = rows.length || 1;
  const sorted = Object.entries(tierCounts).sort((a, b) => b[1] - a[1]);
  
  const colors: Record<string, string> = {
    "Optimal Suitability": "#0fb5a5",
    "Moderate Suitability": "#ffc700",
    "Reduced Suitability": "#ff7a59",
    "Unknown": "#999999"
  };
  
  return `
    <div class="eda-section">
      <h3>Aquaculture Suitability Tier Distribution</h3>
      <p class="chart-help">Komposisi label kualitas air pada dataset. Distribusi yang seimbang menunjukkan dataset yang baik untuk pelatihan model.</p>
      <div class="class-distribution">
        <table class="distribution-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Count</th>
              <th>Percentage</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([tier, count]) => {
              const pct = (count / total) * 100;
              const color = colors[tier] || colors["Unknown"];
              return `
                <tr>
                  <td><span class="tier-badge" style="background-color: ${color};">${escapeHtml(tier)}</span></td>
                  <td><strong>${count}</strong></td>
                  <td>${pct.toFixed(1)}%</td>
                  <td>
                    <div class="distribution-bar">
                      <div class="bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
