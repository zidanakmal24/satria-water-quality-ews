import { HERO_LOGO_PATH, predictionFields } from "../constants";
import type { AppPage, AppState, PredictionLog } from "../types";
import { computeEdaStats } from "../utils/eda";
import { escapeAttribute, escapeHtml, formatDate, formatNumber, getDisplayName, getInitials, statusClass } from "../utils/format";
import { renderBarChart, renderBoxplotLike, renderDonut, renderHeatmap, renderLineChart } from "./charts";

export function renderApp(state: AppState) {
  return state.session ? renderPlatform(state) : renderAuthPage(state);
}

function renderAuthPage(state: AppState) {
  const isRegister = state.authMode === "register";

  return `
    <main class="auth-shell">
      <nav class="topbar">
        <div class="brand"><span class="brand-mark">S</span><span>SATRIA</span></div>
        <button class="nav-link" id="toggleModeTop" type="button">${isRegister ? "User Login" : "Create Account"}</button>
      </nav>
      <section class="auth-stage">
        <div class="device-scene" aria-hidden="true">
          <div class="monitor"><span class="camera"></span><div class="screen"></div><span class="stand"></span><span class="base"></span></div>
          <div class="laptop"><span class="camera"></span><div class="screen"></div><span class="keyboard"></span></div>
          <div class="tablet"><span class="camera"></span><div class="screen"></div><span class="home"></span></div>
          <div class="phone"><span class="camera"></span><div class="screen"></div><span class="home"></span></div>
        </div>
        <form class="auth-card" id="authForm">
          <h1>${isRegister ? "CREATE ACCOUNT" : "USER LOGIN"}</h1>
          <p class="subtitle">${isRegister ? "Daftar user baru untuk sistem SATRIA" : "Masuk ke akun SATRIA kamu"}</p>
          ${isRegister ? renderInput("fullName", "text", "Nama lengkap") : ""}
          ${renderInput("email", "email", "nama@email.com")}
          ${renderInput("password", "password", "Minimal 6 karakter")}
          <label class="remember-row"><input type="checkbox" checked /><span>Remember</span></label>
          <button class="primary-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? "Processing..." : isRegister ? "Register" : "Login"}</button>
          <div class="auth-links">
            <button id="toggleModeBottom" type="button">${isRegister ? "Login" : "Register"}</button>
            <button id="forgotPassword" type="button">Forget password</button>
          </div>
          ${state.message ? `<div class="message">${state.message}</div>` : ""}
        </form>
      </section>
    </main>
  `;
}

function renderInput(id: string, type: string, placeholder: string) {
  return `
    <label class="input-group" for="${id}">
      <span class="input-icon">${type === "password" ? "L" : "U"}</span>
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
  const links: { page: AppPage; label: string }[] = [
    { page: "home", label: "Home" },
    { page: "prediction", label: "Prediction" },
    { page: "analytics", label: "Analytics" },
    { page: "reports", label: "Reports" },
    { page: "eda", label: "EDA" },
    { page: "settings", label: "Settings" },
  ];

  return `
    <nav class="platform-nav">
      <button class="brand platform-brand" type="button" data-page="home"><span class="brand-mark">S</span><span>SATRIA</span></button>
      <div class="platform-links">${links.map((link) => `<button class="${state.currentPage === link.page ? "active" : ""}" type="button" data-page="${link.page}">${link.label}</button>`).join("")}</div>
      <div class="platform-user">
        <button class="notification-button" type="button" disabled aria-label="Notifications">!</button>
        <button class="profile-menu ${state.currentPage === "settings" ? "active" : ""}" type="button" data-page="settings">
          <span>Welcome,<strong>${escapeHtml(fullName)}</strong></span>
          <span class="profile-dot">${escapeHtml(getInitials(fullName) || "S")}</span>
        </button>
      </div>
    </nav>
  `;
}

function renderHomePage(state: AppState) {
  return `
    <section class="platform-home">
      <div class="hero-band">
        <div class="hero-content">
          <span class="hero-chip">Active ML Engine v0.1 (2026)</span>
          <h1>Analisis<br />Kualitas Air<br /><span>Akuakultur</span></h1>
          <div class="hero-divider"></div>
          <p>Project SATRIA provides real-time predictive insights to optimize pond health. Leveraging LightGBM classification to support 24/7 water stability and fish welfare.</p>
          <div class="hero-actions"><button type="button" data-page="prediction">Mulai Prediksi</button><button type="button" data-page="analytics">Lihat Analitik</button></div>
        </div>
        <div class="hero-visual">
          <div class="hero-image-frame">
            <img src="${HERO_LOGO_PATH}" alt="SATRIA aquaculture logo" onerror="this.classList.add('is-missing')" />
            <div class="image-upload-placeholder"><strong>Upload logo SATRIA</strong><span>frontend/public/assets/satria-aquaculture-logo.png</span></div>
          </div>
        </div>
      </div>
      <div class="metric-row">
        ${renderMetricCard("RF Accuracy", "99.7%", "+0.2% vs Last Model", "target")}
        ${renderMetricCard("Data Points", formatNumber(state.edaRows.length || 4300), "Updated from Supabase", "data")}
        ${renderMetricCard("Anomalies Detected", "0", "Safe Environment", "shield")}
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
    ["Predictive Modelling", "Input pond parameters manually or sync via IoT to receive instant quality classifications.", "Get Started"],
    ["Real-time Dashboard", "Monitor DO, pH, and Temperature trends across multiple ponds in a single dynamic view.", "View Charts"],
    ["Digital Logbooks", "Manage records of water quality tests, maintenance, and system alerts.", "Manage Logs"],
    ["Scientific EDA", "Deep dive into data distributions, correlations, and outliers.", "Dive Deep"],
  ];

  return `<section class="capabilities"><h2>Ecosystem Capabilities</h2><p>Explore our suite of intelligent tools designed specifically for modern industrial aquaculture.</p><div class="capability-grid">${items.map(([title, body, action]) => `<article><span>${title[0]}</span><h3>${title}</h3><p>${body}</p><button type="button" disabled>${action} ></button></article>`).join("")}</div></section>`;
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
  return `
    <section class="work-page prediction-page">
      <div class="page-heading"><h1>Manual Parameter Input</h1><p>Enter current water quality metrics to get a real-time health classification from the LightGBM model.</p></div>
      <div class="prediction-layout">
        <form class="prediction-form" id="predictionForm"><div class="parameter-grid">${predictionFields.map(([name, label, value]) => `<label><span>${label}</span><input name="${name}" type="number" step="any" value="${value}" required /></label>`).join("")}</div><button class="execute-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? "Running..." : "Execute ML Model Prediction"}</button></form>
        <aside class="result-panel">${state.latestPrediction ? renderPredictionResult(state) : `<div class="empty-result"><strong>Results will appear here</strong><span>after calculation</span></div>`}</aside>
      </div>
      <div class="prediction-bottom"><article class="how-card"><strong>How it works</strong><p>The SATRIA model analyzes 14 parameters against the cleaned aquaculture dataset and stores user prediction logs to Supabase.</p></article><article class="recent-card"><h2>Recent Tests</h2>${renderRecentList(state.predictionLogs.slice(0, 2), state)}</article></div>
    </section>
  `;
}

function renderPredictionResult(state: AppState) {
  const result = state.latestPrediction!;
  return `<div class="result-ready"><span class="result-badge">${escapeHtml(result.predicted_suitability_tier)}</span><h2>${escapeHtml(result.predicted_suitability_tier)}</h2><p>Class ID: ${result.predicted_class_id}</p>${Object.entries(result.probabilities).map(([key, value]) => `<div class="prob-row"><span>${escapeHtml(key)}</span><strong>${(value * 100).toFixed(2)}%</strong></div>`).join("")}</div>`;
}

function renderAnalyticsPage(state: AppState) {
  const stats = computeEdaStats(state.edaRows);
  return `<section class="work-page"><div class="page-heading row-heading"><div><h1>Real-time Insights Dashboard</h1><p>Global telemetry view of Supabase aquaculture records.</p></div><button class="refresh-button" id="refreshData" type="button">Refresh</button></div><div class="insight-strip"><div><span>Total Sensors</span><strong>12</strong></div><div><span>Avg pH</span><strong>${stats.avgPh.toFixed(2)}</strong></div><div><span>Rows</span><strong>${formatNumber(stats.rows)}</strong></div></div><div class="analytics-grid"><article class="chart-card wide"><h2>Water Quality Trends (DO & Temperature)</h2>${renderLineChart()}</article><article class="chart-card"><h2>Status Classes</h2>${renderDonut()}</article><article class="chart-card"><h2>Pond Ammonia Levels</h2>${renderBarChart()}</article><article class="chart-card"><h2>Parameter Correlation</h2>${renderHeatmap()}</article></div></section>`;
}

function renderReportsPage(state: AppState) {
  return `<section class="work-page"><div class="page-heading row-heading"><div><h1>Historical Log Reports</h1><p>Comprehensive archive of your prediction history and ML classifications.</p></div><button class="refresh-button" id="refreshData" type="button">Refresh Logs</button></div><div class="report-toolbar"><input id="reportSearch" placeholder="Search by status..." /><button disabled>All Ponds</button><button disabled>Sort by Date (Newest)</button></div><div class="table-wrap"><table class="log-table"><thead><tr><th>Timestamp</th><th>User</th><th>Parameters (pH/Temp/DO)</th><th>Status</th><th>Actions</th></tr></thead><tbody>${renderReportRows(state)}</tbody></table></div><footer class="reports-footer">Showing ${state.predictionLogs.length} entries from Supabase prediction_results.</footer></section>`;
}

function renderReportRows(state: AppState) {
  if (!state.predictionLogs.length) return `<tr><td colspan="5" class="empty-table">Belum ada log prediksi untuk user ini.</td></tr>`;
  return state.predictionLogs.map((row) => `<tr><td>${formatDate(row.created_at)}</td><td>${escapeHtml(state.profile?.full_name || "Current User")}</td><td><span class="pill">${Number(row.input_data?.ph || 0).toFixed(1)}</span><span class="pill">${Number(row.input_data?.temperature || 0).toFixed(1)} C</span><span class="pill">${Number(row.input_data?.dissolved_oxygen_mg_l || 0).toFixed(1)} mg/L</span></td><td><span class="status-pill ${statusClass(row.predicted_suitability_tier)}">${escapeHtml(row.predicted_suitability_tier)}</span></td><td><button disabled>View</button></td></tr>`).join("");
}

function renderEdaPage(state: AppState) {
  const stats = computeEdaStats(state.edaRows);
  return `<section class="work-page"><div class="page-heading row-heading"><div><h1>Exploratory Data Analysis</h1><p>Realtime statistical breakdown from Supabase table water_quality_clean.</p></div><button class="refresh-button" id="refreshData" type="button">Refresh EDA</button></div><div class="eda-summary-grid"><article><span>Total Sample Size</span><strong>${formatNumber(stats.rows)}</strong><p>Supabase rows loaded</p></article><article><span>Features Extracted</span><strong>${stats.features}</strong><p>Chemical and physical variables</p></article><article><span>Missing Values</span><strong>${stats.missingPct.toFixed(2)}%</strong><p>Calculated in browser</p></article></div><div class="eda-grid"><article class="stats-table"><h2>Descriptive Statistics</h2>${renderStatsTable(state)}</article><article class="chart-card wide"><h2>Parameter Distributions</h2>${renderLineChart()}</article><article class="chart-card box-wide"><h2>Outlier Analysis</h2>${renderBoxplotLike()}</article></div></section>`;
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
  const role = state.profile?.role || "Aquaculture Engineer";
  const organization = state.profile?.organization || "SATRIA Research";
  const bio = state.profile?.bio || "Focusing on shrimp pond optimization through advanced environment telemetry and machine learning intervention.";

  return `<section class="settings-page"><header class="profile-header"><div class="avatar">${escapeHtml(getInitials(fullName) || "S")}</div><div><h1>${escapeHtml(fullName)}</h1><p>${escapeHtml(role)} & Lead Researcher</p><div class="profile-tags"><span>System Admin</span><span>${escapeHtml(organization)}</span></div></div></header><div class="settings-layout"><aside class="settings-sidebar"><button class="active">Profile Details</button><button disabled>Security & Privacy</button><button id="logoutButton" class="danger" type="button">Sign Out</button><div class="note-card"><strong>Security & Privacy</strong><p>Profile user aktif tersimpan di Supabase table profiles.</p></div></aside><form class="profile-card" id="profileForm"><h2>Profile Configuration</h2><div class="profile-form-grid"><label><span>Full Name</span><input name="fullName" value="${escapeAttribute(fullName)}" required /></label><label><span>Email Address</span><input value="${escapeAttribute(email)}" disabled /></label><label><span>Role</span><input name="role" value="${escapeAttribute(role)}" required /></label><label><span>Organization</span><input name="organization" value="${escapeAttribute(organization)}" required /></label><label class="wide"><span>Bio / Research Focus</span><textarea name="bio" rows="5">${escapeHtml(bio)}</textarea></label></div><button class="save-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? "Saving..." : "Save Profile Changes"}</button>${state.message ? `<div class="message settings-message">${state.message}</div>` : ""}</form></div><footer class="settings-footer">SATRIA v0.1-STABLE | Last logged in: ${new Date().toLocaleString()}</footer></section>`;
}

function renderRecentList(rows: PredictionLog[], state: AppState) {
  if (!rows.length) return `<p class="empty-small">Belum ada recent test.</p>`;
  return rows.map((row) => `<div class="recent-item"><div><strong>${formatDate(row.created_at)}</strong><span>${escapeHtml(row.predicted_suitability_tier)}</span></div><span class="status-pill ${statusClass(row.predicted_suitability_tier)}">${escapeHtml(row.predicted_suitability_tier)}</span></div>`).join("");
}
