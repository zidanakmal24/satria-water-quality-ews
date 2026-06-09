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
  if (state.currentPage === "reset-password") return renderResetPasswordPage(state);
  if (!state.session && state.currentPage !== "login") return renderPublicHomePage(state);
  return state.session ? renderPlatform(state) : renderAuthPage(state);
}

function renderResetPasswordPage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  return `
    <main class="auth-shell">
      <nav class="topbar">
        <button class="brand auth-brand" type="button" data-page="home"><span class="brand-mark">S</span><span>SATRIA</span></button>
        <div class="auth-nav-actions">
          <button class="nav-link" type="button" data-page="home">${label("home")}</button>
          ${renderLanguageSwitcher(state)}
        </div>
      </nav>
      <section class="auth-stage reset-stage">
        <div class="auth-info-panel">
          <div class="auth-logo-card">
            <img src="${HERO_LOGO_PATH}" alt="SATRIA aquaculture logo" />
            <span>${label("authBrandLine")}</span>
          </div>
          <span class="auth-kicker">${state.language === "en" ? "Password Recovery" : "Pemulihan Password"}</span>
          <h2>${state.language === "en" ? "Create a new password for your SATRIA account." : "Buat password baru untuk akun SATRIA kamu."}</h2>
          <p>${state.language === "en" ? "This page opens from the Supabase recovery email and does not require profile completion first." : "Halaman ini terbuka dari email recovery Supabase dan tidak perlu melengkapi profil terlebih dahulu."}</p>
        </div>
        <form class="auth-card" id="resetPasswordForm">
          <div class="auth-card-logo">
            <img src="${HERO_LOGO_PATH}" alt="SATRIA logo" />
            <span>SATRIA</span>
          </div>
          <h1>${state.language === "en" ? "Reset Password" : "Reset Password"}</h1>
          <p class="subtitle">${state.language === "en" ? "Enter and confirm your new password." : "Masukkan dan konfirmasi password baru kamu."}</p>
          ${renderInput("newPassword", "password", state.language === "en" ? "New Password" : "Password Baru", state.language === "en" ? "Minimum 6 characters" : "Minimal 6 karakter")}
          ${renderInput("confirmPassword", "password", state.language === "en" ? "Confirm Password" : "Konfirmasi Password", state.language === "en" ? "Repeat new password" : "Ulangi password baru")}
          <button class="primary-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? label("processing") : state.language === "en" ? "Save New Password" : "Simpan Password Baru"}</button>
          ${state.message ? `<div class="message">${state.message}</div>` : ""}
        </form>
      </section>
    </main>
  `;
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
          <button class="nav-link" type="button" data-auth-mode="login">${label("monitoring")}</button>
          <button class="nav-link" type="button" data-auth-mode="login">${label("eda")}</button>
          <button class="nav-link" type="button" data-auth-mode="login">${label("predictions")}</button>
          <button class="nav-link" type="button" data-auth-mode="login">${label("reports")}</button>
          <button class="nav-link ${!isRegister ? "active" : ""}" type="button" data-auth-mode="login">${label("login")}</button>
          <button class="nav-link ${isRegister ? "active" : ""}" type="button" data-auth-mode="register">${label("register")}</button>
          ${renderLanguageSwitcher(state)}
        </div>
      </nav>
      <section class="auth-stage">
        <div class="auth-info-panel">
          <div class="auth-logo-card">
            <img src="${HERO_LOGO_PATH}" alt="SATRIA aquaculture logo" />
            <span>${label("authBrandLine")}</span>
          </div>
          <span class="auth-kicker">${isRegister ? label("authRegisterKicker") : label("authLoginKicker")}</span>
          <h2>${isRegister ? label("authRegisterPanelTitle") : label("authLoginPanelTitle")}</h2>
          <p>${label("authPanelDescription")}</p>
          <div class="auth-benefits">
            <span>${label("authBenefitRealtime")}</span>
            <span>${label("authBenefitProfile")}</span>
            <span>${label("authBenefitEda")}</span>
          </div>
        </div>
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
    [label("eda"), label("featureEda"), state.language === "id" ? "A" : "E"],
    [label("predictions"), label("featurePrediction"), "P"],
    [label("reports"), label("featureReports"), state.language === "id" ? "L" : "R"],
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
        </div>
      </div>
      <section class="public-section">
        <div class="public-section-heading">
          <h2>SATRIA</h2>
          <p>${label("publicHeroSubtitle")}</p>
        </div>
        <div class="public-feature-grid">
          ${features.map(([title, body, icon]) => `<article><span>${icon}</span><h3>${title}</h3><p>${body}</p><button type="button" data-auth-mode="login">${label("login")}</button></article>`).join("")}
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
      ${renderHomeFooter(state)}
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
    { page: "home", label: label("home") },
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
        ${renderMetricCard(label("activeModel"), modelName.toUpperCase(), label("modelDetail").replace("14", String(featureCount)), "target")}
        ${renderMetricCard(label("cleanDataPoints"), formatNumber(dataPointValue), label("cleanDataDetail"), "data")}
        ${renderMetricCard(label("riskLogs"), formatNumber(riskLogs), state.session ? label("riskLogsDetail") : label("riskLoginDetail"), "shield")}
      </div>
      ${renderCapabilities(state)}
      ${renderHomeFooter(state)}
    </section>
  `;
}

function renderMetricCard(label: string, value: string, detail: string, icon: string) {
  return `<article><span class="metric-icon ${icon}">${escapeHtml(label.slice(0, 1).toUpperCase())}</span><p>${label}</p><strong>${value}</strong><small>${detail}</small></article>`;
}

function renderCapabilities(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const items = [
    [label("capabilityPredictionTitle"), label("capabilityPredictionBody"), label("capabilityPredictionAction"), "prediction"],
    [label("capabilityMonitoringTitle"), label("capabilityMonitoringBody"), label("capabilityMonitoringAction"), "analytics"],
    [label("capabilityReportsTitle"), label("capabilityReportsBody"), label("capabilityReportsAction"), "reports"],
    [label("capabilityEdaTitle"), label("capabilityEdaBody"), label("capabilityEdaAction"), "eda"],
  ];

  return `<section class="capabilities"><h2>${label("capabilityTitle")}</h2><p>${label("capabilityDescription")}</p><div class="capability-grid">${items.map(([title, body, action, page]) => `<article><span>${escapeHtml(title[0])}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p><button type="button" data-page="${page}">${escapeHtml(action)} &gt;</button></article>`).join("")}</div></section>`;
}

function renderHomeFooter(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  return `
    <footer class="home-footer">
      <div class="footer-grid">
        <div><div class="brand footer-brand"><span class="brand-mark">S</span><span>SATRIA</span></div><p>${label("footerDescription")}</p><div class="social-row"><button disabled>f</button><button disabled>x</button><button disabled>in</button><button disabled>gh</button></div></div>
        <div><h4>${label("footerPlatform")}</h4><button data-page="home">${label("footerHomePage")}</button><button data-page="prediction">${label("footerMlPrediction")}</button><button data-page="analytics">${label("footerAnalyticsDashboard")}</button><button data-page="reports">${label("footerLogReports")}</button></div>
        <div><h4>${label("footerResources")}</h4><button data-page="eda">${label("footerDatasetEda")}</button><button disabled>${label("footerDocumentation")}</button><button disabled>${label("footerApiReference")}</button><button disabled>${label("footerCommunityForum")}</button></div>
        <div><h4>${label("footerContactSupport")}</h4><p>${label("footerContactDescription")}</p><button disabled>support@satria.local</button><small>${label("footerResponseTime")}</small></div>
      </div>
      <div class="footer-bottom"><span>${label("footerRights")}</span><span>${label("footerPolicy")}</span></div>
    </footer>
  `;
}

function renderPredictionPage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const modelName = state.modelInfo?.model_name || "LightGBM";
  const jsonExample = buildPredictionJsonExample();
  return `
    <section class="work-page prediction-page">
      <div class="page-heading"><h1>${label("predictionPageTitle")}</h1><p>${label("predictionPageSubtitle")}</p></div>
      <div class="model-strip">
        <div><span>${label("modelStripActiveModel")}</span><strong>${escapeHtml(modelName.toUpperCase())}</strong></div>
        <div><span>${label("modelStripInputFeatures")}</span><strong>${state.modelInfo?.features?.length || predictionFields.length}</strong></div>
        <div><span>${label("modelStripClasses")}</span><strong>${state.modelInfo?.classes?.length || 3}</strong></div>
      </div>
      <form class="prediction-form prediction-section" id="predictionForm">
        <div class="preset-section">
          <div class="preset-header">
            <span class="preset-title">${label("demoPresets")}</span>
            <button type="reset" class="preset-reset-btn">${label("resetForm")}</button>
          </div>
          <div class="preset-buttons">
            <button type="button" class="preset-btn optimal" data-preset="optimal">${label("presetOptimal")} (${label("statusOptimal")})</button>
            <button type="button" class="preset-btn moderate" data-preset="moderate">${label("presetModerate")} (${label("statusModerate")})</button>
            <button type="button" class="preset-btn critical" data-preset="critical">${label("presetCritical")} (${label("statusReduced")})</button>
          </div>
        </div>
        <div class="parameter-grid">${predictionFields.map(([name, , example]) => `<label><span>${escapeHtml(predictionFieldLabel(name, state.language))}</span><small>${label("inputFormatHint")}</small><input name="${name}" type="number" step="any" placeholder="${label("sample")}: ${example}" required /><em class="input-error">${label("inputFormatError")}</em></label>`).join("")}</div>
        <button class="execute-button" id="executePrediction" type="submit" disabled>${state.loading ? label("running") : label("executePrediction")}</button>
        <div class="prediction-actions">
          <label><span>${label("uploadJsonBatch")}</span><small>${label("uploadJsonHelp")}</small><span class="file-input-shell"><span>${label("chooseFile")}</span><input id="bulkPredictionFile" type="file" accept="application/json" ${state.loading ? "disabled" : ""} /></span><em>${label("noFileChosen")}</em></label>
          <details class="json-example-panel">
            <summary>${label("viewJsonExample")}</summary>
            <ul>
              <li>${label("jsonGuideDecimal")}</li>
              <li>${label("jsonGuideArray")}</li>
              <li>${label("jsonGuideFields")}</li>
              <li>${label("jsonGuideMultiple")}</li>
            </ul>
            <pre id="predictionJsonExample">${escapeHtml(jsonExample)}</pre>
            <div class="json-example-actions"><button type="button" id="copyJsonExample">${label("copyExample")}</button><button type="button" id="downloadSampleJson">${label("downloadSampleJson")}</button></div>
          </details>
        </div>
        ${state.message ? `<div class="message">${escapeHtml(state.message)}</div>` : ""}
      </form>
      <aside class="result-panel prediction-section">${state.latestPrediction ? renderPredictionResult(state) : `<div class="empty-result"><strong>${label("resultsWillAppear")}</strong><span>${label("afterCalculation")}</span></div>`}</aside>
      <article class="recent-card prediction-section"><h2>${label("recentTests")}</h2>${renderRecentList(state.predictionLogs.slice(0, 3), state)}</article>
      <article class="how-card prediction-section"><strong>${label("howItWorks")}</strong><p>${label("howItWorksBody1")}</p><p>${label("howItWorksBody2")}</p></article>
    </section>
  `;
}

function renderPredictionResult(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const result = state.latestPrediction!;
  return `<div class="result-ready"><span class="result-badge">${escapeHtml(translateStatus(result.predicted_suitability_tier, state.language))}</span><h2>${label("predictionResult")}</h2><p>${label("classId")}: ${result.predicted_class_id}</p>${renderRecommendation(result.predicted_suitability_tier, state)}${Object.entries(result.probabilities).map(([key, value]) => `<div class="prob-row"><span>${escapeHtml(translateStatus(key, state.language))}</span><strong>${(value * 100).toFixed(2)}%</strong></div>`).join("")}<button class="report-link-button" type="button" data-page="reports">${label("viewFullReport")}</button></div>`;
}

function renderRecommendation(tier: string, state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const normalized = tier.toLowerCase();
  const tone = normalized.includes("optimal") ? "optimal" : normalized.includes("moderate") ? "moderate" : "unsafe";
  const message = normalized.includes("optimal")
    ? label("recommendationOptimal")
    : normalized.includes("moderate")
      ? label("recommendationModerate")
      : label("recommendationUnsafe");
  return `<article class="recommendation-card ${tone}"><strong>${label("recommendationTitle")}</strong><p>${escapeHtml(message)}</p></article>`;
}

function renderAnalyticsPage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const userRows = state.predictionLogs.map((log) => log.input_data || {});
  const stats = computeEdaStats(userRows);
  const active = numericParameters.find((item) => item.key === state.analyticsMetric);
  const parameterName = active ? t(state.language, parameterTranslationKey(active.key)) : "Parameter";
  const latestStatus = state.predictionLogs[0]?.predicted_suitability_tier || "N/A";
  return `<section class="work-page"><div class="page-heading row-heading"><div><h1>${label("monitoringTitle")}</h1><p>${label("monitoringSubtitle")}</p><span class="realtime-badge ${state.realtimeConnected ? "on" : ""}">${state.realtimeConnected ? label("monitoringRealtimeOn") : label("monitoringRealtimePending")}</span></div><button class="refresh-button" id="refreshData" type="button">${label("refresh")}</button></div><div class="insight-strip"><div><span>${label("userLogs")}</span><strong>${formatNumber(state.predictionLogs.length)}</strong></div><div><span>${label("avgPh")}</span><strong>${stats.avgPh.toFixed(2)}</strong></div><div><span>${label("avgNitrite")}</span><strong>${stats.nitriteMean.toFixed(3)}</strong></div><div><span>${label("latestStatus")}</span><strong>${escapeHtml(translateStatus(latestStatus, state.language))}</strong></div></div>${!state.predictionLogs.length ? `<div class="empty-analytics">${label("noDataAnalytics")}</div>` : ""}<div class="analytics-grid"><article class="chart-card wide"><div class="chart-heading"><div><h2>${label("userWaterTrends")}: ${escapeHtml(parameterName)}</h2><p>${label("trendDescription")}</p></div>${renderMetricTabs(state.analyticsMetric, "analytics", state.language)}</div>${renderLineChart(userRows, state.analyticsMetric, "temperature", state.language)}</article><article class="chart-card"><h2>${label("statusClasses")}</h2>${renderDonut(state.predictionLogs, state.language)}</article><article class="chart-card"><h2>${escapeHtml(parameterName)} ${label("levels")}</h2>${renderBarChart(userRows, state.analyticsMetric, state.language)}</article><article class="chart-card"><h2>${label("nitriteLevels")}</h2>${renderBarChart(userRows, "nitrite_mg_l_1", state.language)}</article><article class="chart-card wide"><h2>${label("userParameterCorrelation")}</h2><p class="chart-caption">${label("correlationCaption")}</p>${renderHeatmap(userRows, state.language)}</article></div></section>`;
}

function parameterTranslationKey(key: string): Parameters<typeof t>[1] {
  const map: Record<string, Parameters<typeof t>[1]> = {
    temperature: "paramTemperature",
    ph: "paramPh",
    dissolved_oxygen_mg_l: "paramDissolvedOxygen",
    ammonia_mg_l_1: "paramAmmonia",
    nitrite_mg_l_1: "paramNitrite",
    phosphorus_mg_l_1: "paramPhosphorus",
    total_hardness_mg_l_1: "paramHardness",
    total_alkalinity_mg_l_1: "paramAlkalinity",
    turbidity_cm: "paramTurbidity",
    biochemical_oxygen_demand_mg_l: "paramBod",
    carbon_dioxide_co2: "paramCarbonDioxide",
    calcium_mg_l_1: "paramCalcium",
    hydrogen_sulfide_mg_l_1: "paramHydrogenSulfide",
    plankton_count_no_l_1: "paramPlanktonCount",
  };
  return map[key] || "valueAxis";
}

function predictionFieldLabel(key: string, language: AppState["language"]) {
  return t(language, parameterTranslationKey(key));
}

function buildPredictionJsonExample() {
  const row = predictionFields.reduce<Record<string, number>>((acc, [name, , example]) => {
    acc[name] = example;
    return acc;
  }, {});
  return JSON.stringify([row], null, 2);
}

function translateStatus(status: string, language: AppState["language"]) {
  const normalized = status.toLowerCase();
  if (normalized.includes("optimal")) return t(language, "statusOptimal");
  if (normalized.includes("moderate")) return t(language, "statusModerate");
  if (normalized.includes("reduced")) return t(language, "statusReduced");
  return status || t(language, "statusUnknown");
}

function renderReportsPage(state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  const latest = state.predictionLogs[0];
  const latestStatus = state.latestPrediction?.predicted_suitability_tier || latest?.predicted_suitability_tier || label("noPredictionYet");
  const filtered = filteredLogs(state);
  const pageSize = 10;
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(Math.max(state.reportPage, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const interpretedStatus = translateStatus(latestStatus, state.language);
  const interpretation = label("finalInterpretationBody").replace("{status}", interpretedStatus);
  return `<section class="work-page reports-page"><div class="page-heading row-heading"><div><h1>${label("reportsTitle")}</h1><p>${label("reportsSubtitle")}</p></div><button class="refresh-button" id="refreshData" type="button">${label("refreshLogs")}</button></div><div class="report-summary-grid report-summary-grid-compact"><article><span>${label("monitoringSummary")}</span><strong>${formatNumber(state.predictionLogs.length)}</strong><p>${label("monitoringSummaryBody")}</p></article><article><span>${label("predictionSummary")}</span><strong>${escapeHtml(interpretedStatus)}</strong><p>${label("predictionSummaryBody")}</p></article></div><article class="final-interpretation"><h2>${label("finalInterpretation")}</h2><p>${escapeHtml(interpretation)}</p><p class="chart-caption">${label("pdfFutureNote")}</p></article><div class="report-toolbar"><input id="reportSearch" placeholder="${label("reportSearchPlaceholder")}" value="${escapeAttribute(state.reportSearch)}" /><button type="button" data-refresh>${label("syncSupabase")}</button><button type="button" id="downloadReportsCsv">${label("downloadCsv")}</button></div><div class="table-wrap"><table class="log-table"><thead><tr><th>${label("tableTimestamp")}</th><th>${label("tableUser")}</th><th>${label("tableParameters")}</th><th>${label("tableStatus")}</th><th>${label("tableActions")}</th></tr></thead><tbody>${renderReportRows(state, pageRows)}</tbody></table></div>${renderReportPagination(state, filtered.length, currentPage, totalPages, pageRows.length)}${state.message ? `<div class="message">${escapeHtml(state.message)}</div>` : ""}</section>`;
}

function renderReportRows(state: AppState, rows: PredictionLog[]) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  if (!rows.length) return `<tr><td colspan="5" class="empty-table">${label("noReportRows")}</td></tr>`;
  const user = state.profile?.full_name || state.session?.user.email || "Current User";
  return rows.map((row) => `<tr><td>${formatDate(row.created_at)}</td><td>${escapeHtml(user)}</td><td><span class="pill">pH ${Number(row.input_data?.ph || 0).toFixed(1)}</span><span class="pill">${Number(row.input_data?.temperature || 0).toFixed(1)} C</span><span class="pill">${Number(row.input_data?.dissolved_oxygen_mg_l || 0).toFixed(1)} mg/L</span></td><td><span class="status-pill ${statusClass(row.predicted_suitability_tier)}">${escapeHtml(translateStatus(row.predicted_suitability_tier, state.language))}</span></td><td><button type="button" title="${label("reportSynced")}">${label("reportSynced")}</button></td></tr>`).join("");
}

function renderReportPagination(state: AppState, filteredCount: number, currentPage: number, totalPages: number, currentCount: number) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  return `<footer class="reports-footer report-pagination"><span>${label("reportsShowing")} ${formatNumber(currentCount)} ${label("reportsOf")} ${formatNumber(filteredCount)} ${label("reportsEntries")} | ${label("totalData")}: ${formatNumber(state.predictionLogs.length)}</span><div><button type="button" data-report-page="prev" ${currentPage <= 1 ? "disabled" : ""}>${label("previous")}</button><strong>${label("page")} ${currentPage} / ${totalPages}</strong><button type="button" data-report-page="next" ${currentPage >= totalPages ? "disabled" : ""}>${label("next")}</button></div></footer>`;
}

function filteredLogs(state: AppState) {
  const term = state.reportSearch.trim().toLowerCase();
  if (!term) return state.predictionLogs;
  const user = `${state.profile?.full_name || ""} ${state.session?.user.email || ""}`.toLowerCase();
  return state.predictionLogs.filter((row) => {
    const date = `${row.created_at || ""} ${formatDate(row.created_at)}`.toLowerCase();
    const status = `${row.predicted_suitability_tier} ${translateStatus(row.predicted_suitability_tier, state.language)}`.toLowerCase();
    return status.includes(term) || user.includes(term) || date.includes(term);
  });
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
  const temporaryNotice = state.temporaryPasswordReset
    ? `<div class="message settings-message password-reset-notice">Anda login menggunakan password sementara hasil reset. Demi keamanan akun, segera ubah password Anda melalui form Change Password di bawah ini.</div>`
    : "";
  return `<form class="profile-card" id="securityForm"><h2>Security & Privacy</h2>${temporaryNotice}<div class="profile-form-grid"><label><span>Username / Display Name</span><input name="securityFullName" value="${escapeAttribute(fullName)}" required /></label><label><span>Login Email</span><input value="${escapeAttribute(email)}" disabled /></label><label><span>New Password</span><input name="newPassword" type="password" minlength="6" placeholder="Kosongkan jika tidak diganti" /></label><label><span>Confirm Password</span><input name="confirmPassword" type="password" minlength="6" placeholder="Ulangi password baru" /></label><label class="wide privacy-check"><input type="checkbox" checked /><span>Allow SATRIA to show my name on prediction reports for this account.</span></label></div><button class="save-button" type="submit" ${state.loading ? "disabled" : ""}>${state.loading ? "Saving..." : "Save Security"}</button>${state.message ? `<div class="message settings-message">${state.message}</div>` : ""}</form>`;
}

function renderRecentList(rows: PredictionLog[], state: AppState) {
  const label = (key: Parameters<typeof t>[1]) => t(state.language, key);
  if (!rows.length) return `<p class="empty-small">${label("noPredictionLogs")}</p>`;
  return `<div class="recent-list-header"><span>${label("dateTime")}</span><span>${label("status")}</span></div>${rows.map((row) => `<div class="recent-item"><div><strong>${formatDate(row.created_at)}</strong><span>${label("predictionHistory")}</span></div><span class="status-pill ${statusClass(row.predicted_suitability_tier)}">${escapeHtml(translateStatus(row.predicted_suitability_tier, state.language))}</span></div>`).join("")}`;
}
