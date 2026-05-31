import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./services/supabase";
import "./styles.css";

type AuthMode = "login" | "register";
type AppPage = "home" | "settings";
type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  organization: string | null;
  bio: string | null;
  avatar_url: string | null;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Root app element tidak ditemukan.");
}

let mode: AuthMode = "login";
let loading = false;
let message = "";
let session: Session | null = null;
let currentPage: AppPage = "home";
let profile: Profile | null = null;

const fieldLabels = {
  fullName: "Full name",
  email: "Email",
  password: "Password",
};

function render() {
  app.innerHTML = session ? renderPlatform() : renderAuthPage();
  bindEvents();
}

function renderAuthPage() {
  const isRegister = mode === "register";

  return `
    <main class="auth-shell">
      <nav class="topbar">
        <div class="brand">
          <span class="brand-mark">S</span>
          <span>SATRIA</span>
        </div>
        <button class="nav-link" id="toggleModeTop" type="button">
          ${isRegister ? "User Login" : "Create Account"}
        </button>
      </nav>

      <section class="auth-stage">
        <div class="device-scene" aria-hidden="true">
          <div class="monitor">
            <span class="camera"></span>
            <div class="screen"></div>
            <span class="stand"></span>
            <span class="base"></span>
          </div>
          <div class="laptop">
            <span class="camera"></span>
            <div class="screen"></div>
            <span class="keyboard"></span>
          </div>
          <div class="tablet">
            <span class="camera"></span>
            <div class="screen"></div>
            <span class="home"></span>
          </div>
          <div class="phone">
            <span class="camera"></span>
            <div class="screen"></div>
            <span class="home"></span>
          </div>
        </div>

        <form class="auth-card" id="authForm">
          <h1>${isRegister ? "CREATE ACCOUNT" : "USER LOGIN"}</h1>
          <p class="subtitle">${isRegister ? "Daftar user baru untuk sistem SATRIA" : "Masuk ke akun SATRIA kamu"}</p>

          ${isRegister ? renderInput("fullName", fieldLabels.fullName, "text", "Nama lengkap") : ""}
          ${renderInput("email", fieldLabels.email, "email", "nama@email.com")}
          ${renderInput("password", fieldLabels.password, "password", "Minimal 6 karakter")}

          <label class="remember-row">
            <input id="remember" type="checkbox" checked />
            <span>Remember</span>
          </label>

          <button class="primary-button" type="submit" ${loading ? "disabled" : ""}>
            ${loading ? "Processing..." : isRegister ? "Register" : "Login"}
          </button>

          <div class="auth-links">
            <button id="toggleModeBottom" type="button">${isRegister ? "Login" : "Register"}</button>
            <button id="forgotPassword" type="button">Forget password</button>
          </div>

          ${message ? `<div class="message">${message}</div>` : ""}
        </form>
      </section>
    </main>
  `;
}

function renderInput(id: string, label: string, type: string, placeholder: string) {
  const icon = type === "password" ? "lock" : "user";

  return `
    <label class="input-group" for="${id}">
      <span class="input-icon">${icon === "lock" ? "L" : "U"}</span>
      <input id="${id}" name="${id}" type="${type}" placeholder="${placeholder}" aria-label="${label}" required />
    </label>
  `;
}

function renderPlatform() {
  return `
    <main class="platform-shell">
      ${renderPlatformNav()}
      ${currentPage === "settings" ? renderSettingsPage() : renderHomePage()}
    </main>
  `;
}

function renderPlatformNav() {
  const user = session?.user;
  const fullName = profile?.full_name || user?.user_metadata?.full_name || "SATRIA User";
  const links: { page: AppPage | "prediction" | "analytics" | "reports" | "eda"; label: string }[] = [
    { page: "home", label: "Home" },
    { page: "prediction", label: "Prediction" },
    { page: "analytics", label: "Analytics" },
    { page: "reports", label: "Reports" },
    { page: "eda", label: "EDA" },
    { page: "settings", label: "Settings" },
  ];

  return `
    <nav class="platform-nav">
      <button class="brand platform-brand" type="button" data-page="home">
        <span class="brand-mark">S</span>
        <span>SATRIA</span>
      </button>
      <div class="platform-links">
        ${links
          .map((link) =>
            link.page === "home" || link.page === "settings"
              ? `<button class="${currentPage === link.page ? "active" : ""}" type="button" data-page="${link.page}">${link.label}</button>`
              : `<button type="button" data-soon="${link.label}">${link.label}</button>`,
          )
          .join("")}
      </div>
      <div class="platform-user">
        <button class="notification-button" type="button" data-soon="Notifications" aria-label="Notifications">!</button>
        <button class="profile-menu ${currentPage === "settings" ? "active" : ""}" type="button" data-page="settings">
          <span>Welcome,<strong>${escapeHtml(fullName)}</strong></span>
          <span class="profile-dot">${escapeHtml(getInitials(fullName) || "S")}</span>
        </button>
      </div>
    </nav>
  `;
}

function renderHomePage() {
  const user = session?.user;
  const fullName = profile?.full_name || user?.user_metadata?.full_name || "SATRIA User";

  return `
    <section class="platform-home">
      <div class="hero-band">
        <div class="hero-content">
          <span class="hero-chip">Active profile: ${escapeHtml(fullName)}</span>
          <h1>Analisis<br />Kualitas Air<br /><span>Akuakultur</span></h1>
          <p>
            Platform prediksi kualitas air berbasis machine learning untuk mendukung
            monitoring tambak, klasifikasi risiko, dan keputusan operasional.
          </p>
          <div class="hero-actions">
            <button type="button" data-soon="Prediction">Mulai Prediksi</button>
            <button type="button" data-page="settings">Lihat Akun</button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-image-frame">
            <img
              src="/assets/satria-aquaculture-logo.png"
              alt="SATRIA aquaculture logo"
              onerror="this.classList.add('is-missing')"
            />
            <div class="image-upload-placeholder">
              <strong>Upload logo SATRIA</strong>
              <span>Replace file: frontend/public/assets/satria-aquaculture-logo.jpeg</span>
            </div>
          </div>
        </div>
      </div>

      <div class="metric-row">
        <article>
          <span class="metric-icon">A</span>
          <p>Accuracy</p>
          <strong>99.7%</strong>
          <small>LightGBM model</small>
        </article>
        <article>
          <span class="metric-icon purple">D</span>
          <p>Data Points</p>
          <strong>4.3K</strong>
          <small>Clean dataset</small>
        </article>
        <article>
          <span class="metric-icon amber">R</span>
          <p>Anomalies Detected</p>
          <strong>0</strong>
          <small>Ready for monitoring</small>
        </article>
      </div>

      <section class="capabilities">
        <h2>Ecosystem Capabilities</h2>
        <p>Alur kerja prediksi dan manajemen data akuakultur dalam satu platform.</p>
        <div class="capability-grid">
          <article>
            <span>P</span>
            <h3>Predictive Modelling</h3>
            <p>Prediksi kualitas air dari parameter fisik dan kimia.</p>
          </article>
          <article>
            <span>D</span>
            <h3>Dashboard Analytics</h3>
            <p>Metrik model, data profile, dan hasil prediksi user.</p>
          </article>
          <article>
            <span>L</span>
            <h3>Digital Logbooks</h3>
            <p>Riwayat hasil prediksi tersimpan untuk monitoring.</p>
          </article>
          <article>
            <span>E</span>
            <h3>Scientific EDA</h3>
            <p>EDA, preprocessing, dan MLflow tracking sudah terhubung.</p>
          </article>
        </div>
      </section>

      <footer class="home-footer">
        <div class="footer-grid">
          <div>
            <div class="brand footer-brand">
              <span class="brand-mark">S</span>
              <span>SATRIA</span>
            </div>
            <p>Platform analisis kualitas air akuakultur berbasis machine learning.</p>
            <div class="social-row">
              <button type="button" disabled>f</button>
              <button type="button" disabled>x</button>
              <button type="button" disabled>in</button>
              <button type="button" disabled>gh</button>
            </div>
          </div>
          <div>
            <h4>Platform</h4>
            <button type="button" data-page="home">Home Page</button>
            <button type="button" data-soon="ML Prediction">ML Prediction</button>
            <button type="button" data-soon="Analytics Dashboard">Analytics Dashboard</button>
            <button type="button" data-soon="Log Reports">Log Reports</button>
          </div>
          <div>
            <h4>Resources</h4>
            <button type="button" data-soon="Dataset EDA">Dataset EDA</button>
            <button type="button" data-soon="Documentation">Documentation</button>
            <button type="button" data-soon="API Reference">API Reference</button>
            <button type="button" data-soon="Community Forum">Community Forum</button>
          </div>
          <div>
            <h4>Contact Support</h4>
            <p>Support links dimatikan dulu sampai channel resmi final.</p>
            <button type="button" disabled>support@satria.local</button>
            <small>Response time: soon</small>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Project SATRIA. All rights reserved.</span>
          <span>Privacy Policy · Terms of Service</span>
        </div>
      </footer>
    </section>
  `;
}

function renderSettingsPage() {
  const user = session?.user;
  const fullName = profile?.full_name || user?.user_metadata?.full_name || "SATRIA User";
  const email = profile?.email || user?.email || "";
  const role = profile?.role || "Aquaculture Engineer";
  const organization = profile?.organization || "SATRIA Research";
  const bio = profile?.bio || "Focusing on shrimp pond optimization through advanced environment telemetry and machine learning intervention.";
  const initials = fullName
    ? getInitials(fullName)
    : "";

  return `
    <section class="settings-page">
      <header class="profile-header">
        <div class="avatar">${escapeHtml(initials || "S")}</div>
        <div>
          <h1>${escapeHtml(fullName)}</h1>
          <p>${escapeHtml(role)} & Lead Researcher</p>
          <div class="profile-tags">
            <span>System Admin</span>
            <span>${escapeHtml(organization)}</span>
          </div>
        </div>
      </header>

      <div class="settings-layout">
        <aside class="settings-sidebar">
          <button class="active" type="button">Profile Details</button>
          <button type="button">Security & Privacy</button>
          <button id="logoutButton" class="danger" type="button">Sign Out</button>
          <div class="note-card">
            <strong>Security & Privacy</strong>
            <p>Data profil tersimpan di tabel Supabase profiles sesuai user login.</p>
          </div>
        </aside>

        <form class="profile-card" id="profileForm">
          <h2>Profile Configuration</h2>
          <div class="profile-form-grid">
            <label>
              <span>Full Name</span>
              <input name="fullName" value="${escapeAttribute(fullName)}" required />
            </label>
            <label>
              <span>Email Address</span>
              <input name="email" value="${escapeAttribute(email)}" disabled />
            </label>
            <label>
              <span>Role</span>
              <input name="role" value="${escapeAttribute(role)}" required />
            </label>
            <label>
              <span>Organization</span>
              <input name="organization" value="${escapeAttribute(organization)}" required />
            </label>
            <label class="wide">
              <span>Bio / Research Focus</span>
              <textarea name="bio" rows="5">${escapeHtml(bio)}</textarea>
            </label>
          </div>
          <button class="save-button" type="submit" ${loading ? "disabled" : ""}>
            ${loading ? "Saving..." : "Save Profile Changes"}
          </button>
          ${message ? `<div class="message settings-message">${message}</div>` : ""}
        </form>
      </div>
      <footer class="settings-footer">SATRIA v0.1-STABLE | Last logged in: ${new Date().toLocaleString()}</footer>
    </section>
  `;
}

function bindEvents() {
  document.querySelector("#toggleModeTop")?.addEventListener("click", toggleMode);
  document.querySelector("#toggleModeBottom")?.addEventListener("click", toggleMode);
  document.querySelector("#forgotPassword")?.addEventListener("click", handleForgotPassword);
  document.querySelector("#logoutButton")?.addEventListener("click", handleLogout);
  document.querySelector("#authForm")?.addEventListener("submit", handleSubmit);
  document.querySelector("#profileForm")?.addEventListener("submit", handleProfileSave);
  document.querySelectorAll<HTMLElement>("[data-page]").forEach((element) => {
    element.addEventListener("click", () => {
      currentPage = element.dataset.page as AppPage;
      message = "";
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-soon]").forEach((element) => {
    element.addEventListener("click", () => {
      message = `${element.dataset.soon} akan disambungkan pada tahap berikutnya.`;
      render();
    });
  });
}

function toggleMode() {
  mode = mode === "login" ? "register" : "login";
  message = "";
  render();
}

async function handleSubmit(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();

  if (!email || !password || (mode === "register" && !fullName)) {
    message = "Semua field wajib diisi.";
    render();
    return;
  }

  loading = true;
  message = "";
  render();

  const response =
    mode === "register"
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

  loading = false;

  if (response.error) {
    message = response.error.message;
    render();
    return;
  }

  if (mode === "register" && !response.data.session) {
    message = "Register berhasil. Cek email kamu untuk konfirmasi akun.";
    render();
    return;
  }

  message = mode === "register" ? "Register berhasil." : "Login berhasil.";
  session = response.data.session;
  await loadProfile();
  render();
}

async function handleForgotPassword() {
  const emailInput = document.querySelector<HTMLInputElement>("#email");
  const email = emailInput?.value.trim();
  if (!email) {
    message = "Isi email dulu untuk reset password.";
    render();
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  message = error ? error.message : "Link reset password dikirim ke email kamu.";
  render();
}

async function handleLogout() {
  await supabase.auth.signOut();
  session = null;
  profile = null;
  currentPage = "home";
  mode = "login";
  message = "";
  render();
}

async function loadProfile() {
  const user = session?.user;
  if (!user) {
    profile = null;
    return;
  }

  const fallback = {
    id: user.id,
    email: user.email || null,
    full_name: user.user_metadata?.full_name || "SATRIA User",
    role: user.user_metadata?.role || "Aquaculture Engineer",
    organization: user.user_metadata?.organization || "SATRIA Research",
    bio: user.user_metadata?.bio || "",
    avatar_url: null,
  };

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) {
    profile = fallback;
    return;
  }

  if (!data) {
    const { data: inserted } = await supabase.from("profiles").insert(fallback).select("*").single();
    profile = inserted || fallback;
    return;
  }

  profile = data as Profile;
}

async function handleProfileSave(event: Event) {
  event.preventDefault();
  const user = session?.user;
  if (!user) {
    return;
  }

  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const updates = {
    id: user.id,
    email: user.email || "",
    full_name: String(formData.get("fullName") || "").trim(),
    role: String(formData.get("role") || "").trim(),
    organization: String(formData.get("organization") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
    updated_at: new Date().toISOString(),
  };

  loading = true;
  message = "";
  render();

  const { data, error } = await supabase.from("profiles").upsert(updates).select("*").single();
  loading = false;

  if (error) {
    message = error.message;
    render();
    return;
  }

  profile = data as Profile;
  await supabase.auth.updateUser({
    data: {
      full_name: updates.full_name,
      role: updates.role,
      organization: updates.organization,
      bio: updates.bio,
    },
  });
  message = "Profile berhasil disimpan ke Supabase.";
  render();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

supabase.auth.getSession().then(({ data }) => {
  session = data.session;
  loadProfile().then(render);
});

supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
  session = nextSession;
  loadProfile().then(render);
});
