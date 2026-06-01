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

  return `
    <div class="chart-legend">
      <span><i class="teal"></i>${escapeHtml(primaryMeta?.label || primaryKey)}</span>
      <span><i class="blue"></i>${escapeHtml(secondaryMeta?.label || secondaryKey)}</span>
    </div>
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

  return `
    <div class="chart-caption">${escapeHtml(meta?.label || key)} sampled levels</div>
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
    <div class="donut-legend">
      ${Object.entries(counts).map(([label, count]) => `<span class="${statusClass(label)}">${escapeHtml(label)}: ${count}</span>`).join("") || "<span>No prediction logs yet</span>"}
    </div>
  `;
}

export function renderHeatmap(rows: EdaRecord[]) {
  const keys = ["ph", "temperature", "dissolved_oxygen_mg_l", "nitrite_mg_l_1", "ammonia_mg_l_1"];
  return `<div class="heatmap-axis"><span></span>${keys.map((key) => `<strong>${shortLabel(key)}</strong>`).join("")}${keys
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
  return `<div class="boxplot">${keys.map((key) => renderBoxRow(rows, key)).join("")}</div>`;
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

function shortLabel(key: string) {
  const meta = numericParameters.find((item) => item.key === key);
  return meta?.label || key.replaceAll("_", " ");
}

function renderChartStats(nums: number[], unit = "") {
  const { min, max } = extent(nums);
  return `<div class="chart-stat-row"><span>Min <b>${formatMetricValue(min, unit)}</b></span><span>Avg <b>${formatMetricValue(average(nums), unit)}</b></span><span>Max <b>${formatMetricValue(max, unit)}</b></span></div>`;
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
