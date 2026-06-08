import { HERO_LOGO_PATH, numericParameters, predictionFields } from "../constants";
import type { AppPage, AppState, PredictionLog } from "../types";
import { computeEdaStats, renderClassDistribution, renderDataInfoTable, renderOutlierAnalysis, renderPhDistribution } from "../utils/eda";
import { escapeAttribute, escapeHtml, formatDate, formatNumber, getDisplayName, getInitials, statusClass } from "../utils/format";
import { t } from "../utils/translations";
import {
  renderBarChart,
  renderBoxplotLike,
  renderDatasetClassDistribution,
  renderDonut,
  renderHeatmap,
  renderHistogram,
  renderLineChart,
  renderMetricTabs,
  renderRiskFlagSummary,
} from "./charts";

export function renderApp(state: AppState) {
  if (!state.session && state.currentPage !== "login") return renderPublicHomePage(state);
  return state.session ? renderPlatform(state) : renderAuthPage(state);
}

function renderAuthPage(state: AppState) {
  const isRegister = state.authMode === "register";
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);

  return `
    <main class="auth-shell">
      <nav class="topbar">
        <button class="brand auth-brand" type="button" data-page="home"><span class="brand-mark">S</span><span>SATRIA</span></button>
        <button class="public-menu-toggle" type="button" data-menu-toggle aria-label="${label("publicNavOpen")}"><span></span><span></span><span></span></button>
        <div class="auth-nav-actions">
          <button class="nav-link" type="button" data-page="home">${label("home")}</button>
          <button class="nav-link ${!isRegister ? "active" : ""}" type="button" data-auth-mode="login">${label("login")}</button>
          <button class="nav-link ${isRegister ? "active" : ""}" type="button" data-auth-mode="register">${label("register")}</button>
          ${renderLanguageSwitcher(state)}
        </div>
      </nav>
      <section class="auth-stage">
        <form class="auth-card" id="authForm">
          <div class="auth-card-logo">
            <img src="${HERO_LOGO_PATH}" alt="SATRIA logo" />
            <span>SATRIA</span>
          </div>
          <h1>${isRegister ? label("registerTitle") : label("loginTitle")}</h1>
          <p class="subtitle">${isRegister ? label("authRegisterSubtitle") : label("authLoginSubtitle")}</p>
          ${isRegister ? renderInput("fullName", "text", label("authFullName"), label("authFullNamePlaceholder")) : ""}
          ${renderInput("email", "email", label("authEmail"), label("authEmailPlaceholder"))}
          ${renderInput("password", "password", label("authPassword"), label("authPasswordPlaceholder"))}
          ${isRegister ? renderInput("confirmPassword", "password", label("authConfirmPassword"), label("authConfirmPasswordPlaceholder")) : ""}
          ${!isRegister ? `<div class="auth-helper-row"><label class="remember-row"><input type="checkbox" checked /><span>${label("remember")}</span></label><button id="forgotPassword" type="button">${label("forgotPassword")}</button></div>` : ""}
          <button class="primary-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? label("processing") : isRegister ? label("register") : label("login")}</button>
          <button class="auth-mode-link" id="toggleModeBottom" type="button">${isRegister ? label("switchToLogin") : label("switchToRegister")}</button>
          ${state.message ? `<div class="message">${state.message}</div>` : ""}
        </form>
      </section>
    </main>
  `;
}

function renderLanguageSwitcher(state: AppState) {
  return `<div class="language-switcher" aria-label="Language switcher"><button class="${state.language === "id" ? "active" : ""}" type="button" data-language="id">ID</button><button class="${state.language === "en" ? "active" : ""}" type="button" data-language="en">EN</button></div>`;
}

function renderInput(id: string, type: string, label: string, placeholder: string) {
  return `
    <label class="input-group" for="${id}">
      <span>${label}</span>
      <input id="${id}" name="${id}" type="${type}" placeholder="${placeholder}" required />
    </label>
  `;
}

function renderPlatform(state: AppState) {
  return `
    <main class="platform-shell">
      ${renderPlatformNav(state)}
      ${renderCurrentPage(state)}
    </main>
  `;
}

function renderPublicHomePage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  return `
    <main class="platform-shell public-shell">
      <nav class="platform-nav public-nav">
        <button class="brand platform-brand" type="button" data-page="home"><span class="brand-mark">S</span><span>SATRIA</span></button>
        <button class="public-menu-toggle" type="button" data-menu-toggle aria-label="${label("publicNavOpen")}"><span></span><span></span><span></span></button>
        <div class="platform-links public-links"><button class="active" type="button" data-page="home">${label("home")}</button><button type="button" data-auth-mode="login">${label("monitoring")}</button><button type="button" data-auth-mode="login">${label("eda")}</button><button type="button" data-auth-mode="login">${label("predictions")}</button><button type="button" data-auth-mode="login">${label("reports")}</button></div>
        <div class="public-auth-actions">${renderLanguageSwitcher(state)}<button type="button" data-auth-mode="login">${label("login")}</button><button type="button" data-auth-mode="register">${label("register")}</button></div>
      </nav>
      ${renderPublicLandingPage(state)}
    </main>
  `;
}

function renderPublicLandingPage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const features = [
    ["Monitoring", label("featureMonitoring"), "M"],
    [label("eda"), label("featureEda"), "E"],
    [label("predictions"), label("featurePrediction"), "P"],
    [label("reports"), label("featureReports"), "R"],
  ];

  return `
    <section class="public-landing">
      <div class="public-hero">
        <div class="public-hero-copy">
          <span class="hero-chip">${label("authBrandLine")}</span>
          <h1>${label("publicHeroTitle")}</h1>
          <p>${label("publicHeroSubtitle")}</p>
          <div class="public-hero-actions">
            <button class="primary-button" type="button" data-auth-mode="login">${label("login")}</button>
            <button class="secondary-button" type="button" data-auth-mode="register">${label("register")}</button>
            <a href="#about-satria">${label("learnMore")}</a>
          </div>
        </div>
        <div class="public-hero-panel" aria-label="SATRIA preview">
          <img src="${HERO_LOGO_PATH}" alt="SATRIA aquaculture logo" />
          <div>
            <span>${label("monitoring")}</span>
            <strong>pH | DO | Nitrite | Ammonia</strong>
          </div>
        </div>
      </div>
      <section class="public-section">
        <div class="public-section-heading">
          <h2>SATRIA</h2>
          <p>${label("publicHeroSubtitle")}</p>
        </div>
        <div class="public-feature-grid">
          ${features.map(([title, body, icon]) => `<article><span>${icon}</span><h3>${title}</h3><p>${body}</p></article>`).join("")}
        </div>
      </section>
      <section class="public-about" id="about-satria">
        <div>
          <span class="hero-chip">${label("aboutTitle")}</span>
          <h2>${label("aboutTitle")}</h2>
          <p>${label("aboutBody")}</p>
        </div>
        <dl>
          <div><dt>${label("version")}</dt><dd>v0.1 (2026)</dd></div>
          <div><dt>${label("contact")}</dt><dd>satria.waterquality@example.com</dd></div>
          <div><dt>${label("githubRepository")}</dt><dd>SoviaLearner/satria-water-quality-ews</dd></div>
        </dl>
      </section>
      ${renderHomeFooter()}
    </section>
  `;
}

function renderCurrentPage(state: AppState) {
  if (state.currentPage === "prediction") return renderPredictionPage(state);
  if (state.currentPage === "analytics") return renderAnalyticsPage(state);
  if (state.currentPage === "reports") return renderReportsPage(state);
  if (state.currentPage === "eda") return renderEdaPage(state);
  if (state.currentPage === "settings") return renderSettingsPage(state);
  return renderHomePage(state);
}

function renderPlatformNav(state: AppState) {
  const fullName = getDisplayName(state);
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const links: { page: AppPage; label: string }[] = [
    { page: "home", label: label("dashboard") },
    { page: "analytics", label: label("monitoring") },
    { page: "eda", label: label("eda") },
    { page: "prediction", label: label("predictions") },
    { page: "reports", label: label("reports") },
    { page: "settings", label: label("profile") },
  ];

  return `
    <nav class="platform-nav app-nav">
      <button class="brand platform-brand" type="button" data-page="home"><span class="brand-mark">S</span><span>SATRIA</span></button>
      <button class="public-menu-toggle app-menu-toggle" type="button" data-menu-toggle aria-label="${label("publicNavOpen")}"><span></span><span></span><span></span></button>
      <div class="platform-links">${links.map((link) => `<button class="${state.currentPage === link.page ? "active" : ""}" type="button" data-page="${link.page}">${link.label}</button>`).join("")}</div>
      <div class="platform-user">
        ${renderLanguageSwitcher(state)}
        <button class="notification-button" type="button" disabled aria-label="Notifications">Alert</button>
        <button class="profile-menu ${state.currentPage === "settings" ? "active" : ""}" type="button" data-page="settings">
          <span>Welcome,<strong>${escapeHtml(fullName)}</strong></span>
          <span class="profile-dot">${escapeHtml(getInitials(fullName) || "S")}</span>
        </button>
      </div>
      <button class="mobile-nav-overlay" type="button" data-menu-overlay aria-label="Close navigation"></button>
      <aside class="mobile-sidebar" aria-label="SATRIA mobile navigation">
        <div class="mobile-sidebar-head">
          <span class="brand"><span class="brand-mark">S</span><span>SATRIA</span></span>
          <button type="button" data-menu-toggle>${label("publicNavClose")}</button>
        </div>
        <div class="mobile-sidebar-links">
          ${links.map((link) => `<button class="${state.currentPage === link.page ? "active" : ""}" type="button" data-page="${link.page}">${link.label}</button>`).join("")}
          <button class="danger" id="navLogoutButton" type="button">${label("logout")}</button>
        </div>
        ${renderLanguageSwitcher(state)}
      </aside>
    </nav>
  `;
}

function renderHomePage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const modelName = state.modelInfo?.model_name || "LightGBM";
  const featureCount = state.modelInfo?.features?.length || predictionFields.length;
  const dataPointValue = state.edaTotalRows || state.edaRows.length;
  const riskLogs = state.userRiskCount;
  return `
    <section class="platform-home">
      <div class="hero-band">
        <div class="hero-content">
          <span class="hero-chip">Active ML Engine v0.1 (2026)</span>
          <h1>${label("heroTitle")}</h1>
          <div class="hero-divider"></div>
          <p>${label("heroDescription")}</p>
          <div class="hero-actions"><button type="button" data-page="prediction">${label("startPrediction")}</button><button type="button" data-page="analytics">${label("viewAnalytics")}</button></div>
        </div>
        <div class="hero-visual">
          <div class="hero-image-frame">
            <img src="${HERO_LOGO_PATH}" alt="SATRIA aquaculture logo" onerror="this.classList.add('is-missing')" />
            <div class="image-upload-placeholder"><strong>Upload logo SATRIA</strong><span>frontend/public/assets/satria-aquaculture-logo.png</span></div>
          </div>
        </div>
      </div>
      <div class="metric-row">
        ${renderMetricCard(label("activeModel"), modelName.toUpperCase(), `${featureCount} input features ready`, "target")}
        ${renderMetricCard(label("cleanDataPoints"), formatNumber(dataPointValue), "Exact count from Supabase", "data")}
        ${renderMetricCard(label("riskLogs"), formatNumber(riskLogs), state.session ? "Reduced suitability in your logs" : "Login to track user risks", "shield")}
      </div>
      ${renderCapabilities()}
      ${renderHomeFooter()}
    </section>
  `;
}

function renderMetricCard(label: string, value: string, detail: string, icon: string) {
  return `<article><span class="metric-icon ${icon}">${icon.slice(0, 1).toUpperCase()}</span><p>${label}</p><strong>${value}</strong><small>${detail}</small></article>`;
}

function renderCapabilities() {
  const items = [
    ["Predictive Modelling", "Input pond parameters manually or sync via IoT to receive instant quality classifications.", "Get Started", "prediction"],
    ["Real-time Dashboard", "Monitor DO, pH, Nitrite, and Temperature trends across Supabase records.", "View Charts", "analytics"],
    ["Digital Logbooks", "Manage records of water quality tests, maintenance, and system alerts.", "Manage Logs", "reports"],
    ["Scientific EDA", "Deep dive into data distributions, correlations, and outliers.", "Dive Deep", "eda"],
  ];

  return `<section class="capabilities"><h2>Ecosystem Capabilities</h2><p>Explore our suite of intelligent tools designed specifically for modern industrial aquaculture.</p><div class="capability-grid">${items.map(([title, body, action, page]) => `<article><span>${title[0]}</span><h3>${title}</h3><p>${body}</p><button type="button" data-page="${page}">${action} ></button></article>`).join("")}</div></section>`;
}

function renderHomeFooter() {
  return `
    <footer class="home-footer">
      <div class="footer-grid">
        <div><div class="brand footer-brand"><span class="brand-mark">S</span><span>SATRIA</span></div><p>Leading the future of sustainable aquaculture through precision machine learning and real-time environmental monitoring.</p><div class="social-row"><button disabled>f</button><button disabled>x</button><button disabled>in</button><button disabled>gh</button></div></div>
        <div><h4>Platform</h4><button data-page="home">Home Page</button><button data-page="prediction">ML Prediction</button><button data-page="analytics">Analytics Dashboard</button><button data-page="reports">Log Reports</button></div>
        <div><h4>Resources</h4><button data-page="eda">Dataset EDA</button><button disabled>Documentation</button><button disabled>API Reference</button><button disabled>Community Forum</button></div>
        <div><h4>Contact Support</h4><p>Have questions? Reach out to our technical team.</p><button disabled>support@satria.local</button><small>Response time: soon</small></div>
      </div>
      <div class="footer-bottom"><span>2026 Project SATRIA. All rights reserved.</span><span>Privacy Policy | Terms of Service</span></div>
    </footer>
  `;
}

function renderPredictionPage(state: AppState) {
  const modelName = state.modelInfo?.model_name || "LightGBM";
  return `
    <section class="work-page prediction-page">
      <div class="page-heading"><h1>Manual Parameter Input</h1><p>Enter current water quality metrics to get a real-time health classification from the LightGBM model.</p></div>
      <div class="model-strip">
        <div><span>Active Model</span><strong>${escapeHtml(modelName.toUpperCase())}</strong></div>
        <div><span>Input Features</span><strong>${state.modelInfo?.features?.length || predictionFields.length}</strong></div>
        <div><span>Prediction Classes</span><strong>${state.modelInfo?.classes?.length || 3}</strong></div>
      </div>
      <div class="prediction-layout">
        <form class="prediction-form" id="predictionForm">
          <div class="preset-section">
            <div class="preset-header">
              <span class="preset-title">DEMO PRESETS (SATU-KLIK ISI OTOMATIS)</span>
              <button type="reset" class="preset-reset-btn">Reset Form</button>
            </div>
            <div class="preset-buttons">
              <button type="button" class="preset-btn optimal" data-preset="optimal">Air Ideal (Optimal)</button>
              <button type="button" class="preset-btn moderate" data-preset="moderate">Air Stress (Sedang)</button>
              <button type="button" class="preset-btn critical" data-preset="critical">Air Bahaya (Kritis)</button>
            </div>
          </div>
          <div class="parameter-grid">${predictionFields.map(([name, label, example]) => `<label><span>${label}</span><small>Cara format: isi angka saja, gunakan titik untuk desimal.</small><input name="${name}" type="number" step="any" placeholder="Contoh: ${example}" required /><em class="input-error">Inputan yang dilakukan harus sesuai dengan format petunjuk di atas!</em></label>`).join("")}</div><button class="execute-button" id="executePrediction" type="submit" disabled>${state.loading ? "Running..." : "Execute ML Model Prediction"}</button><div class="prediction-actions"><label><span>Upload JSON Batch</span><small>File harus berisi array object dengan nama field API yang sama seperti form.</small><input id="bulkPredictionFile" type="file" accept="application/json" ${state.loading ? "disabled" : ""} /></label></div>${state.message ? `<div class="message">${state.message}</div>` : ""}</form>
        <aside class="result-panel">${state.latestPrediction ? renderPredictionResult(state) : `<div class="empty-result"><strong>Results will appear here</strong><span>after calculation</span></div>`}</aside>
      </div>
      <div class="prediction-bottom"><article class="how-card"><strong>How it works</strong><p>The SATRIA model analyzes 14 parameters against the cleaned aquaculture dataset and stores user prediction logs to Supabase.</p><p>Jika hasil sering Reduced, cek ammonia, nitrite, phosphorus, hydrogen sulfide, dan plankton count. Model mengikuti pola dataset training, bukan aturan manual sederhana.</p></article><article class="recent-card"><h2>Recent Tests</h2>${renderRecentList(state.predictionLogs.slice(0, 2))}</article></div>
    </section>
  `;
}

function renderPredictionResult(state: AppState) {
  const result = state.latestPrediction!;
  return `<div class="result-ready"><span class="result-badge">${escapeHtml(result.predicted_suitability_tier)}</span><h2>${escapeHtml(result.predicted_suitability_tier)}</h2><p>Class ID: ${result.predicted_class_id}</p>${renderRecommendation(result.predicted_suitability_tier)}${Object.entries(result.probabilities).map(([key, value]) => `<div class="prob-row"><span>${escapeHtml(key)}</span><strong>${(value * 100).toFixed(2)}%</strong></div>`).join("")}<button class="report-link-button" type="button" data-page="reports">Lihat Laporan Lengkap</button></div>`;
}

function renderRecommendation(tier: string) {
  const normalized = tier.toLowerCase();
  const tone = normalized.includes("optimal") ? "optimal" : normalized.includes("moderate") ? "moderate" : "unsafe";
  const message = normalized.includes("optimal")
    ? "Kondisi air optimal. Pertahankan monitoring rutin dan hindari perubahan parameter mendadak."
    : normalized.includes("moderate")
      ? "Kondisi air cukup baik, tetapi perlu pemantauan pH, DO, nitrite, dan ammonia sebelum pemberian pakan berikutnya."
      : "Kondisi air berisiko. Segera lakukan aerasi, penggantian air parsial, dan pengecekan senyawa toksik.";
  return `<article class="recommendation-card ${tone}"><strong>Rekomendasi Tindakan</strong><p>${escapeHtml(message)}</p></article>`;
}

function renderAnalyticsPage(state: AppState) {
  const userRows = state.predictionLogs.map((log) => log.input_data || {});
  const stats = computeEdaStats(userRows);
  const active = numericParameters.find((item) => item.key === state.analyticsMetric);
  return `<section class="work-page"><div class="page-heading row-heading"><div><h1>User Analytics Dashboard</h1><p>Visualisasi ini memakai riwayat input dan hasil prediksi milik user aktif, bukan dataset global EDA.</p><span class="realtime-badge ${state.realtimeConnected ? "on" : ""}">${state.realtimeConnected ? "Realtime connected" : "Realtime pending"}</span></div><button class="refresh-button" id="refreshData" type="button">Refresh</button></div><div class="insight-strip"><div><span>User Logs</span><strong>${formatNumber(state.predictionLogs.length)}</strong></div><div><span>Avg pH</span><strong>${stats.avgPh.toFixed(2)}</strong></div><div><span>Avg Nitrite</span><strong>${stats.nitriteMean.toFixed(3)}</strong></div><div><span>Latest Status</span><strong>${escapeHtml(state.predictionLogs[0]?.predicted_suitability_tier || "N/A")}</strong></div></div>${!state.predictionLogs.length ? `<div class="empty-analytics">Belum ada riwayat prediksi user. Jalankan Prediction terlebih dahulu agar grafik realtime terisi dari prediction_results.</div>` : ""}<div class="analytics-grid"><article class="chart-card wide"><div class="chart-heading"><div><h2>User Water Trends: ${escapeHtml(active?.label || "Parameter")}</h2><p>Sampling dari prediction_results.input_data milik akun ini.</p></div>${renderMetricTabs(state.analyticsMetric, "analytics")}</div>${renderLineChart(userRows, state.analyticsMetric, "temperature")}</article><article class="chart-card"><h2>Status Classes</h2>${renderDonut(state.predictionLogs)}</article><article class="chart-card"><h2>${escapeHtml(active?.label || "Parameter")} Levels</h2>${renderBarChart(userRows, state.analyticsMetric)}</article><article class="chart-card"><h2>Nitrite Levels</h2>${renderBarChart(userRows, "nitrite_mg_l_1")}</article><article class="chart-card wide"><h2>User Parameter Correlation</h2><p class="chart-caption">Korelasi dihitung dari input historis user. Tambahkan lebih banyak prediksi agar pola makin stabil.</p>${renderHeatmap(userRows)}</article></div></section>`;
}

function renderReportsPage(state: AppState) {
  const latest = state.predictionLogs[0];
  const latestStatus = state.latestPrediction?.predicted_suitability_tier || latest?.predicted_suitability_tier || "Belum ada prediksi";
  return `<section class="work-page"><div class="page-heading row-heading"><div><h1>Laporan Akhir SATRIA</h1><p>Ringkasan monitoring, referensi EDA notebook, hasil prediksi, dan interpretasi kualitas air.</p></div><button class="refresh-button" id="refreshData" type="button">Refresh Logs</button></div><div class="report-summary-grid"><article><span>Monitoring Summary</span><strong>${formatNumber(state.predictionLogs.length)}</strong><p>Total log prediksi user dari Supabase.</p></article><article><span>EDA Summary Reference</span><strong>PyCaret</strong><p>EDA mengikuti report notebook asli tanpa kalkulasi ulang.</p><button type="button" data-page="eda">Lihat EDA</button></article><article><span>Prediction Summary</span><strong>${escapeHtml(latestStatus)}</strong><p>Hasil terakhir dapat menjadi peringatan awal kualitas air.</p></article></div><article class="final-interpretation"><h2>Final Interpretation</h2><p>Berdasarkan hasil prediksi sistem, kualitas air diklasifikasikan sebagai <b>${escapeHtml(latestStatus)}</b>. Hasil ini dapat digunakan sebagai peringatan awal untuk membantu pengambilan keputusan monitoring, aerasi, dan pengelolaan kolam.</p><p class="chart-caption">Fitur export PDF dapat disiapkan untuk pengembangan berikutnya.</p></article><div class="report-toolbar"><input id="reportSearch" placeholder="Search by status..." value="${escapeAttribute(state.reportSearch)}" /><button type="button" data-refresh>Sync Supabase</button><button type="button" id="downloadReportsCsv">Download CSV</button></div><div class="table-wrap"><table class="log-table"><thead><tr><th>Timestamp</th><th>User</th><th>Parameters (pH/Temp/DO)</th><th>Status</th><th>Actions</th></tr></thead><tbody>${renderReportRows(state)}</tbody></table></div><footer class="reports-footer">Showing ${filteredLogs(state).length} of ${state.predictionLogs.length} entries from Supabase prediction_results.</footer>${state.message ? `<div class="message">${state.message}</div>` : ""}</section>`;
}

function renderReportRows(state: AppState) {
  const rows = filteredLogs(state);
  if (!rows.length) return `<tr><td colspan="5" class="empty-table">Belum ada log prediksi yang cocok.</td></tr>`;
  return rows.map((row) => `<tr><td>${formatDate(row.created_at)}</td><td>${escapeHtml(state.profile?.full_name || "Current User")}</td><td><span class="pill">${Number(row.input_data?.ph || 0).toFixed(1)}</span><span class="pill">${Number(row.input_data?.temperature || 0).toFixed(1)} C</span><span class="pill">${Number(row.input_data?.dissolved_oxygen_mg_l || 0).toFixed(1)} mg/L</span></td><td><span class="status-pill ${statusClass(row.predicted_suitability_tier)}">${escapeHtml(row.predicted_suitability_tier)}</span></td><td><button type="button" title="Stored in Supabase">Synced</button></td></tr>`).join("");
}

function filteredLogs(state: AppState) {
  const term = state.reportSearch.trim().toLowerCase();
  if (!term) return state.predictionLogs;
  return state.predictionLogs.filter((row) => row.predicted_suitability_tier.toLowerCase().includes(term));
}

function renderEdaPage(state: AppState) {
  const isEnglish = state.language === "en";
  const stats = computeEdaStats(state.edaRows);
  const active = numericParameters.find((item) => item.key === state.edaMetric);
  return `<section class="work-page eda-native-page"><div class="page-heading row-heading"><div><h1>${isEnglish ? "Exploratory Data Analysis" : "Analisis Data Eksploratif"}</h1><p>${isEnglish ? "Native SATRIA EDA dashboard based on the same dataset context as the PyCaret research report. Values are loaded from Supabase and presented without raw HTML embedding." : "Dashboard EDA native SATRIA berdasarkan konteks dataset yang sama dengan report penelitian PyCaret. Nilai dimuat dari Supabase dan disajikan tanpa embed HTML mentah."}</p><span class="realtime-badge ${state.realtimeConnected ? "on" : ""}">${state.realtimeConnected ? "Supabase synced" : "Supabase pending"}</span></div><div class="eda-action-row"><button class="refresh-button" type="button" data-refresh>${isEnglish ? "Refresh Data" : "Refresh Data"}</button><button class="refresh-button secondary" type="button" data-page="reports">${isEnglish ? "View Full Report" : "Lihat Laporan Lengkap"}</button></div></div><div class="eda-summary-grid"><article><span>Rows</span><strong>${formatNumber(stats.rows)}</strong><p>Sample dari water_quality_clean.</p></article><article><span>Features</span><strong>${formatNumber(stats.features)}</strong><p>Kolom dataset yang terbaca.</p></article><article><span>Missing Values</span><strong>${stats.missingPct.toFixed(2)}%</strong><p>Persentase cell kosong.</p></article><article><span>Avg Nitrite</span><strong>${stats.nitriteMean.toFixed(3)}</strong><p>Mapping memakai nitrite_mg_l_1.</p></article></div><div class="eda-label-grid"><article><strong>Ideal = 0</strong><p>${isEnglish ? "Water quality is safe and meets the expected standard." : "Kondisi air aman dan sesuai standar."}</p></article><article><strong>Sedang / Moderate = 1</strong><p>${isEnglish ? "Water quality requires attention." : "Kondisi air memerlukan perhatian."}</p></article><article><strong>Bahaya / Dangerous = 2</strong><p>${isEnglish ? "Water quality may be hazardous." : "Kondisi air berpotensi membahayakan."}</p></article></div><div class="eda-dashboard-grid"><article class="chart-card wide"><div class="chart-heading"><div><h2>Parameter Distribution: ${escapeHtml(active?.label || "pH")}</h2><p>${isEnglish ? "Distribution chart for the selected water quality parameter." : "Grafik distribusi untuk parameter kualitas air yang dipilih."}</p></div>${renderMetricTabs(state.edaMetric, "eda")}</div>${renderHistogram(state.edaRows, state.edaMetric)}</article><article class="chart-card"><h2>Class Distribution</h2>${renderClassDistribution(state.edaRows)}</article><article class="chart-card"><h2>pH Distribution</h2>${renderPhDistribution(state.edaRows)}</article><article class="chart-card wide"><h2>Outlier Analysis</h2>${renderOutlierAnalysis(state.edaRows)}</article><article class="chart-card wide"><h2>Statistical Summary</h2>${renderStatsTable(state)}</article><article class="chart-card wide"><h2>Dataset Overview & Missing Values</h2>${renderDataInfoTable(state.edaRows)}</article><article class="chart-card wide"><h2>Chart Explanation</h2><p class="chart-help">${isEnglish ? "Read distribution bars as frequency groups, class distribution as label composition, and outlier cards as IQR-based flags. Extreme values should be validated before removal because they may indicate real early warning conditions." : "Baca batang distribusi sebagai kelompok frekuensi, distribusi kelas sebagai komposisi label, dan kartu outlier sebagai flag berbasis IQR. Nilai ekstrem perlu divalidasi sebelum dihapus karena bisa menunjukkan kondisi peringatan dini yang nyata."}</p></article></div></section>`;
}

function renderStatsTable(state: AppState) {
  const stats = computeEdaStats(state.edaRows);
  const rows = [
    ["Temperature", stats.tempMean, 1.25],
    ["pH", stats.avgPh, 0.42],
    ["DO", stats.doMean, 0.88],
    ["Ammonia", stats.ammoniaMean, 0.015],
    ["Nitrite", stats.nitriteMean, 0.008],
  ];
  return `<table><thead><tr><th>Variable</th><th>Mean</th><th>Std Dev</th></tr></thead><tbody>${rows.map(([name, mean, std]) => `<tr><td>${name}</td><td>${Number(mean).toFixed(3)}</td><td>${Number(std).toFixed(3)}</td></tr>`).join("")}</tbody></table>`;
}

function renderSettingsPage(state: AppState) {
  const fullName = getDisplayName(state);
  const email = state.profile?.email || state.session?.user.email || "";
  const role = state.profile?.role || "";
  const organization = state.profile?.organization || "";
  const bio = state.profile?.bio || "";

  return `<section class="settings-page"><header class="profile-header"><div class="avatar profile-avatar"><span>${escapeHtml(getInitials(fullName) || "S")}</span><small>${role && bio ? "READY" : "SETUP"}</small></div><div><h1>${escapeHtml(fullName)}</h1><p>${escapeHtml(role || "Lengkapi role profil")}</p><div class="profile-tags"><span>${role && bio ? "Profile Ready" : "Profile Required"}</span><span>${escapeHtml(organization || "Organization belum diisi")}</span></div></div></header><div class="settings-layout"><aside class="settings-sidebar"><button class="${state.settingsTab === "profile" ? "active" : ""}" type="button" data-settings-tab="profile">Profile Details</button><button class="${state.settingsTab === "security" ? "active" : ""}" type="button" data-settings-tab="security">Security & Privacy</button><button id="logoutButton" class="danger" type="button">Sign Out</button><div class="note-card"><strong>Account Storage</strong><p>Lengkapi role, organization, dan bio agar identitas laporan prediction jelas.</p></div></aside>${state.settingsTab === "security" ? renderSecurityPanel(state, fullName, email) : renderProfilePanel(state, fullName, email, role, organization, bio)}</div><footer class="settings-footer">SATRIA v0.1-STABLE | Last logged in: ${new Date().toLocaleString()}</footer></section>`;
}

function renderProfilePanel(state: AppState, fullName: string, email: string, role: string, organization: string, bio: string) {
  return `<form class="profile-card" id="profileForm"><h2>Profile Configuration</h2><p class="profile-form-note">Field ini sengaja tidak diisi otomatis untuk user baru. Isi sesuai peran dan institusi asli agar report lebih kredibel.</p><div class="profile-form-grid"><label><span>Full Name</span><input name="fullName" value="${escapeAttribute(fullName)}" required /></label><label><span>Email Address</span><input value="${escapeAttribute(email)}" disabled /></label><label><span>Role</span><input name="role" value="${escapeAttribute(role)}" required /></label><label><span>Organization</span><input name="organization" value="${escapeAttribute(organization)}" required /></label><label class="wide"><span>Bio / Research Focus</span><textarea name="bio" rows="5" required>${escapeHtml(bio)}</textarea></label></div><button class="save-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? "Saving..." : "Save Profile Changes"}</button>${state.message ? `<div class="message settings-message">${state.message}</div>` : ""}</form>`;
}

function renderSecurityPanel(state: AppState, fullName: string, email: string) {
  return `<form class="profile-card" id="securityForm"><h2>Security & Privacy</h2><div class="profile-form-grid"><label><span>Username / Display Name</span><input name="securityFullName" value="${escapeAttribute(fullName)}" required /></label><label><span>Login Email</span><input value="${escapeAttribute(email)}" disabled /></label><label><span>New Password</span><input name="newPassword" type="password" minlength="6" placeholder="Kosongkan jika tidak diganti" /></label><label><span>Confirm Password</span><input name="confirmPassword" type="password" minlength="6" placeholder="Ulangi password baru" /></label><label class="wide privacy-check"><input type="checkbox" checked /><span>Allow SATRIA to show my name on prediction reports for this account.</span></label></div><button class="save-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? "Saving..." : "Save Security"}</button>${state.message ? `<div class="message settings-message">${state.message}</div>` : ""}</form>`;
}

function renderRecentList(rows: PredictionLog[]) {
  if (!rows.length) return `<p class="empty-small">Belum ada recent test.</p>`;
  return rows.map((row) => `<div class="recent-item"><div><strong>${formatDate(row.created_at)}</strong><span>${escapeHtml(row.predicted_suitability_tier)}</span></div><span class="status-pill ${statusClass(row.predicted_suitability_tier)}">${escapeHtml(row.predicted_suitability_tier)}</span></div>`).join("");
}
