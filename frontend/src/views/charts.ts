import { numericParameters } from "../constants";
import type { EdaRecord, PredictionLog } from "../types";
import { escapeHtml, statusClass } from "../utils/format";

function values(rows: EdaRecord[], key: string) {
  return rows.map((row) => Number(row[key])).filter(Number.isFinite);
}

function extent(nums: number[]) {
  if (!nums.length) return { min: 0, max: 1 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

function average(nums: number[]) {
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : 0;
}

function percentile(nums: number[], pct: number) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const index = Math.min(Math.floor(sorted.length * pct), sorted.length - 1);
  return sorted[index];
}

function sample(nums: number[], size = 18) {
  if (nums.length <= size) return nums;
  const step = Math.max(Math.floor(nums.length / size), 1);
  return nums.filter((_, index) => index % step === 0).slice(0, size);
}

function points(nums: number[], width = 640, height = 260, pad = 32) {
  const sampled = sample(nums);
  const { min, max } = extent(sampled);
  const usableWidth = width - pad * 2;
  const usableHeight = height - pad * 2;
  return sampled
    .map((value, index) => {
      const x = pad + (index / Math.max(sampled.length - 1, 1)) * usableWidth;
      const y = pad + (1 - (value - min) / (max - min)) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function renderMetricTabs(activeKey: string, group: "eda" | "analytics") {
  return `<div class="chart-tabs">${numericParameters
    .slice(0, 6)
    .map(
      (item) =>
        `<button class="${activeKey === item.key ? "active" : ""}" type="button" data-chart-group="${group}" data-chart-key="${item.key}">${item.label}</button>`,
    )
    .join("")}</div>`;
}

export function renderLineChart(rows: EdaRecord[], primaryKey: string, secondaryKey = "temperature") {
  const primary = values(rows, primaryKey);
  const secondary = values(rows, secondaryKey);
  const primaryMeta = numericParameters.find((item) => item.key === primaryKey);
  const secondaryMeta = numericParameters.find((item) => item.key === secondaryKey);
  if (primary.length < 2) {
    return renderEmptyChart("Belum cukup data trend", "Minimal 2 log prediksi diperlukan agar garis perubahan parameter bisa dibaca.");
  }

  return `
    <div class="chart-legend">
      <span><i class="teal"></i>${escapeHtml(primaryMeta?.label || primaryKey)}</span>
      <span><i class="blue"></i>${escapeHtml(secondaryMeta?.label || secondaryKey)}</span>
    </div>
    <p class="chart-help">Cara baca: garis naik berarti nilai parameter meningkat pada sampel berikutnya. Garis putus-putus menjadi pembanding suhu agar perubahan kualitas air lebih mudah dibandingkan.</p>
    <div class="svg-chart line-chart">
      <svg viewBox="0 0 640 260" preserveAspectRatio="none" role="img" aria-label="Line chart">
        ${renderGridLines()}
        <polyline class="series teal" points="${points(primary)}"></polyline>
        <polyline class="series blue dashed" points="${points(secondary)}"></polyline>
      </svg>
      <div class="x-labels"><span>Start</span><span>Sampled realtime rows</span><span>Latest</span></div>
    </div>
  `;
}

export function renderHistogram(rows: EdaRecord[], key: string) {
  const nums = values(rows, key);
  const meta = numericParameters.find((item) => item.key === key);
  const { min, max } = extent(nums);
  const bins = Array.from({ length: 10 }, () => 0);
  nums.forEach((value) => {
    const index = Math.min(Math.floor(((value - min) / (max - min)) * bins.length), bins.length - 1);
    bins[Math.max(index, 0)] += 1;
  });
  const maxBin = Math.max(...bins, 1);

  return `
    <div class="chart-caption">${escapeHtml(meta?.label || key)} distribution from ${nums.length} Supabase rows</div>
    <p class="chart-help">Cara baca: batang yang lebih tinggi berarti lebih banyak data berada pada rentang nilai tersebut. Distribusi yang melebar menunjukkan variasi parameter lebih besar.</p>
    ${renderChartStats(nums, meta?.unit)}
    <div class="svg-chart histogram-chart">
      ${bins
        .map((count, index) => {
          const height = Math.max((count / maxBin) * 86, 8);
          const binStart = min + ((max - min) / bins.length) * index;
          const binEnd = min + ((max - min) / bins.length) * (index + 1);
          return `<button type="button" title="${binStart.toFixed(3)} - ${binEnd.toFixed(3)}: ${count} rows" style="height:${height}%"><span>${count}</span></button>`;
        })
        .join("")}
    </div>
  `;
}

export function renderBarChart(rows: EdaRecord[], key = "ammonia_mg_l_1") {
  const nums = sample(values(rows, key), 8);
  const { min, max } = extent(nums);
  const meta = numericParameters.find((item) => item.key === key);
  const range = Math.max(max - min, Number.EPSILON);
  if (!nums.length) {
    return renderEmptyChart("Belum ada sampel", `Jalankan prediksi terlebih dahulu agar level ${escapeHtml(meta?.label || key)} bisa divisualisasikan.`);
  }

  return `
    <div class="chart-caption">${escapeHtml(meta?.label || key)} sampled levels</div>
    <p class="chart-help">Cara baca: setiap batang adalah sampel riwayat. Batang tinggi menunjukkan nilai parameter lebih besar dibanding sampel lain pada grafik yang sama.</p>
    ${renderChartStats(nums, meta?.unit)}
    <div class="svg-chart bar-chart">
      ${nums
        .map(
          (value, index) => {
            const height = 16 + ((value - min) / range) * 76;
            return `<button type="button" title="Sample ${index + 1}: ${formatMetricValue(value, meta?.unit)}" style="height:${height}%"><span>${formatMetricValue(value, meta?.unit)}</span></button>`;
          },
        )
        .join("")}
    </div>
  `;
}

export function renderDonut(logs: PredictionLog[]) {
  const counts = logs.reduce<Record<string, number>>((acc, log) => {
    const key = log.predicted_suitability_tier || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const optimal = ((counts["Optimal Suitability"] || 0) / total) * 100;
  const moderate = ((counts["Moderate Suitability"] || 0) / total) * 100;
  const moderateEnd = optimal + moderate;

  return `
    <div class="donut" style="--donut-bg:conic-gradient(#0fb5a5 0 ${optimal}%, #ffc700 ${optimal}% ${moderateEnd}%, #ff7a59 ${moderateEnd}% 100%)"></div>
    <p class="chart-help centered">Cara baca: warna dominan menunjukkan kategori prediksi yang paling sering muncul pada riwayat user.</p>
    <div class="donut-legend">
      ${Object.entries(counts).map(([label, count]) => `<span class="${statusClass(label)}">${escapeHtml(label)}: ${count}</span>`).join("") || "<span>No prediction logs yet</span>"}
    </div>
  `;
}

export function renderDatasetClassDistribution(rows: EdaRecord[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const label = String(row.aquaculture_suitability_tier || row.water_quality_label || "Unknown");
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0) || 1;

  return `
    <p class="chart-help">Cara baca: grafik ini menunjukkan komposisi label kualitas air pada sampel EDA. Jika kategori risiko dominan, dataset memang banyak berisi kondisi tidak ideal.</p>
    <div class="class-bars">
      ${Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => {
          const pct = (count / total) * 100;
          return `<div><span>${escapeHtml(label)}</span><strong>${count} rows</strong><em style="--w:${pct.toFixed(1)}%"></em><small>${pct.toFixed(1)}%</small></div>`;
        })
        .join("")}
    </div>
  `;
}

export function renderHeatmap(rows: EdaRecord[]) {
  const keys = ["ph", "temperature", "dissolved_oxygen_mg_l", "nitrite_mg_l_1", "ammonia_mg_l_1"];
  const completeRows = rows.filter((row) => keys.every((key) => Number.isFinite(Number(row[key]))));
  if (completeRows.length < 3) {
    return renderEmptyChart(
      "Belum cukup data korelasi",
      "Minimal 3 log prediksi dengan parameter lengkap diperlukan. Nilai 1.00 hanya akan ditampilkan setelah korelasi benar-benar bermakna.",
    );
  }
  return `<p class="chart-help">Cara baca: nilai mendekati 1 berarti hubungan antar parameter searah kuat, mendekati -1 berarti berlawanan, dan mendekati 0 berarti hubungannya lemah.</p><div class="heatmap-axis"><span></span>${keys.map((key) => `<strong>${shortLabel(key)}</strong>`).join("")}${keys
    .flatMap((rowKey) =>
      [`<strong>${shortLabel(rowKey)}</strong>`, ...keys.map((colKey) => {
        const corr = rowKey === colKey ? 1 : pseudoCorrelation(rows, rowKey, colKey);
        return `<button type="button" title="${shortLabel(rowKey)} vs ${shortLabel(colKey)}: ${corr.toFixed(2)}" style="--alpha:${Math.max(Math.abs(corr), 0.18)}">${corr.toFixed(2)}</button>`;
      })],
    )
    .join("")}</div>`;
}

export function renderBoxplotLike(rows: EdaRecord[], activeKey: string) {
  const keys = [activeKey, "ph", "dissolved_oxygen_mg_l", "ammonia_mg_l_1"].filter(
    (key, index, arr) => arr.indexOf(key) === index,
  );
  return `<p class="chart-help">Cara baca: kotak menunjukkan rentang tengah data atau IQR. Label outlier menunjukkan jumlah nilai yang berada jauh dari pola umum dataset.</p><div class="boxplot">${keys.map((key) => renderBoxRow(rows, key)).join("")}</div>${renderOutlierGuidance(rows, keys)}`;
}

function renderBoxRow(rows: EdaRecord[], key: string) {
  const nums = values(rows, key).sort((a, b) => a - b);
  const meta = numericParameters.find((item) => item.key === key);
  if (!nums.length) return `<span style="--w:35%;--x:0%">${escapeHtml(meta?.label || key)}: no data</span>`;
  const min = nums[0];
  const max = nums[nums.length - 1];
  const q1 = nums[Math.floor(nums.length * 0.25)];
  const q3 = nums[Math.floor(nums.length * 0.75)];
  const iqr = q3 - q1;
  const outliers = nums.filter((value) => value < q1 - 1.5 * iqr || value > q3 + 1.5 * iqr).length;
  const width = Math.max(((q3 - q1) / Math.max(max - min, 1)) * 100, 5);
  const x = ((q1 - min) / Math.max(max - min, 1)) * 70;
  return `<span title="${escapeHtml(meta?.label || key)} min ${min.toFixed(2)} max ${max.toFixed(2)}" style="--w:${width}%;--x:${x}%"><b>${escapeHtml(meta?.label || key)}</b><em>${outliers} outlier | IQR ${iqr.toFixed(3)}</em></span>`;
}

export function renderOutlierGuidance(rows: EdaRecord[], keys = numericParameters.slice(0, 6).map((item) => item.key)) {
  const summary = keys.map((key) => getOutlierSummary(rows, key)).filter((item) => item.count > 0);
  const highest = summary.sort((a, b) => b.count - a.count)[0];

  return `
    <div class="outlier-guidance">
      <h3>Cara menangani outlier</h3>
      <p>Outlier jangan langsung dihapus. Untuk EWS kualitas air, nilai ekstrem bisa berarti kondisi bahaya, sensor error, atau variasi lapangan. Gunakan langkah berikut sebelum cleaning:</p>
      <ol>
        <li><b>Validasi sensor/input</b>: cek satuan, typo angka, dan apakah nilai mungkin terjadi secara biologis.</li>
        <li><b>Bandingkan parameter terkait</b>: nitrite/ammonia tinggi dengan DO rendah lebih mungkin risiko nyata daripada error tunggal.</li>
        <li><b>Labelkan, jangan buang dulu</b>: simpan flag outlier agar model tetap belajar pola kondisi bahaya.</li>
        <li><b>Winsorize untuk chart saja</b>: boleh membatasi skala visual agar grafik rapi, tetapi data mentah tetap disimpan.</li>
      </ol>
      <div class="outlier-note">${highest ? `Parameter paling banyak outlier pada tampilan ini: <b>${escapeHtml(highest.label)}</b> (${highest.count} data).` : "Tidak ada outlier signifikan pada parameter yang sedang ditampilkan."}</div>
    </div>
  `;
}

export function renderRiskFlagSummary(rows: EdaRecord[]) {
  const flags = [
    { key: "ph", label: "pH ekstrem", test: (value: number) => value < 6.5 || value > 8.5 },
    { key: "dissolved_oxygen_mg_l", label: "DO rendah", test: (value: number) => value < 4 },
    { key: "ammonia_mg_l_1", label: "Ammonia tinggi", test: (value: number) => value > 0.05 },
    { key: "nitrite_mg_l_1", label: "Nitrite tinggi", test: (value: number) => value > 0.2 },
    { key: "hydrogen_sulfide_mg_l_1", label: "H2S terdeteksi", test: (value: number) => value > 0.02 },
    { key: "plankton_count_no_l_1", label: "Plankton ekstrem", test: (value: number) => value > 100000 },
  ];
  const total = Math.max(rows.length, 1);

  return `
    <p class="chart-help">Cara baca: kartu ini bukan aturan final model, tetapi indikator cepat untuk menemukan parameter yang sering masuk zona perhatian.</p>
    <div class="risk-flag-grid">
      ${flags
        .map((flag) => {
          const count = rows.filter((row) => {
            const value = Number(row[flag.key]);
            return Number.isFinite(value) && flag.test(value);
          }).length;
          const pct = (count / total) * 100;
          return `<div><span>${escapeHtml(flag.label)}</span><strong>${count}</strong><em>${pct.toFixed(1)}% dari sample</em></div>`;
        })
        .join("")}
    </div>
  `;
}

function getOutlierSummary(rows: EdaRecord[], key: string) {
  const nums = values(rows, key);
  const q1 = percentile(nums, 0.25);
  const q3 = percentile(nums, 0.75);
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const meta = numericParameters.find((item) => item.key === key);
  return {
    key,
    label: meta?.label || key,
    count: nums.filter((value) => value < low || value > high).length,
    low,
    high,
  };
}

function shortLabel(key: string) {
  const meta = numericParameters.find((item) => item.key === key);
  return meta?.label || key.replaceAll("_", " ");
}

function renderChartStats(nums: number[], unit = "") {
  const { min, max } = extent(nums);
  return `<div class="chart-stat-row"><span>Min <b>${formatMetricValue(min, unit)}</b></span><span>Avg <b>${formatMetricValue(average(nums), unit)}</b></span><span>Max <b>${formatMetricValue(max, unit)}</b></span></div>`;
}

function renderEmptyChart(title: string, message: string) {
  return `<div class="empty-chart"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
}

function formatMetricValue(value: number, unit = "") {
  const decimals = Math.abs(value) < 1 ? 3 : 2;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

function renderGridLines() {
  return Array.from({ length: 5 }, (_, index) => {
    const y = 32 + index * 48;
    return `<line x1="32" y1="${y}" x2="608" y2="${y}" class="grid"></line>`;
  }).join("");
}

function pseudoCorrelation(rows: EdaRecord[], a: string, b: string) {
  const xs = values(rows, a);
  const ys = values(rows, b);
  const len = Math.min(xs.length, ys.length, 200);
  if (!len) return 0;
  const x = xs.slice(0, len);
  const y = ys.slice(0, len);
  const avgX = x.reduce((m, n) => m + n, 0) / len;
  const avgY = y.reduce((m, n) => m + n, 0) / len;
  const numerator = x.reduce((sum, value, index) => sum + (value - avgX) * (y[index] - avgY), 0);
  const denomX = Math.sqrt(x.reduce((sum, value) => sum + (value - avgX) ** 2, 0));
  const denomY = Math.sqrt(y.reduce((sum, value) => sum + (value - avgY) ** 2, 0));
  return denomX && denomY ? numerator / (denomX * denomY) : 0;
}
