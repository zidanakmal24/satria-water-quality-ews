export function renderLineChart() {
  return `<div class="fake-line-chart"><span></span><span></span><span></span><span></span><span></span><svg viewBox="0 0 600 220" preserveAspectRatio="none"><polyline points="20,160 120,154 220,150 320,156 420,162 560,158" /><polyline class="dashed" points="20,70 120,78 220,86 320,62 420,58 560,70" /></svg></div>`;
}

export function renderBarChart() {
  return `<div class="fake-bars">${[25, 64, 38, 100, 14, 50, 26].map((height) => `<span style="height:${height}%"></span>`).join("")}</div>`;
}

export function renderDonut() {
  return `<div class="donut"></div>`;
}

export function renderHeatmap() {
  return `<div class="heatmap">${Array.from({ length: 16 }, (_, index) => `<span class="h${index % 4}"></span>`).join("")}</div>`;
}

export function renderBoxplotLike() {
  return `<div class="boxplot"><span style="--w:60%;--x:24%">DO</span><span style="--w:18%;--x:60%">pH</span><span style="--w:4%;--x:8%">Ammonia</span></div>`;
}
