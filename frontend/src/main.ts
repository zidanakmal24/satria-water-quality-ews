import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { demoPresets, predictionFields } from "./constants";
import { loadModelInfo, requestTemporaryPasswordReset, runBatchPrediction, runPrediction } from "./services/api";
import {
  loadEdaRowCount,
  loadEdaRows,
  loadPredictionLogs,
  loadProfile,
  loadUserRiskCount,
  saveProfile,
  saveSecuritySettings,
} from "./services/supabaseData";
import { supabase } from "./services/supabase";
import { state } from "./state";
import type { AppPage } from "./types";
import { renderApp } from "./views/appView";
import { t } from "./utils/translations";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const TEMPORARY_RESET_PASSWORD = "12345678";
const TEMPORARY_RESET_EMAIL_KEY = "satria_temporary_reset_email";
const label = (key: Parameters<typeof t>[1]) => t(state.language, key);

if (!app) {
  throw new Error("Root app element tidak ditemukan.");
}

function render() {
  app!.innerHTML = renderApp(state);
  bindEvents();
}

function bindEvents() {
  document.querySelector("#toggleModeTop")?.addEventListener("click", toggleMode);
  document.querySelector("#toggleModeBottom")?.addEventListener("click", toggleMode);
  document.querySelector("#forgotPassword")?.addEventListener("click", handleForgotPassword);
  document.querySelector("#logoutButton")?.addEventListener("click", handleLogout);
  document.querySelector("#navLogoutButton")?.addEventListener("click", handleLogout);
  document.querySelector("#authForm")?.addEventListener("submit", handleAuthSubmit);
  document.querySelector("#resetPasswordForm")?.addEventListener("submit", handleResetPasswordSubmit);
  document.querySelector("#predictionForm")?.addEventListener("submit", handlePredictionSubmit);
  document.querySelector("#predictionForm")?.addEventListener("input", handlePredictionFormInput);
  document.querySelector("#predictionForm")?.addEventListener("reset", (event) => {
    setTimeout(() => handlePredictionFormInput(event), 0);
  });
  document.querySelector("#bulkPredictionFile")?.addEventListener("change", handleBulkPredictionUpload);
  document.querySelector("#copyJsonExample")?.addEventListener("click", handleCopyJsonExample);
  document.querySelector("#downloadSampleJson")?.addEventListener("click", handleDownloadSampleJson);
  document.querySelector("#downloadReportsCsv")?.addEventListener("click", handleDownloadReportsCsv);
  document.querySelector("#profileForm")?.addEventListener("submit", handleProfileSave);
  document.querySelector("#securityForm")?.addEventListener("submit", handleSecuritySave);
  document.querySelectorAll<HTMLElement>("[data-language]").forEach((element) => {
    element.addEventListener("click", () => {
      state.language = element.dataset.language === "en" ? "en" : "id";
      localStorage.setItem("satria_language", state.language);
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-menu-toggle]").forEach((element) => {
    element.addEventListener("click", () => {
      element.closest("nav")?.classList.toggle("is-open");
    });
  });
  document.querySelectorAll<HTMLElement>("[data-menu-overlay]").forEach((element) => {
    element.addEventListener("click", () => {
      element.closest("nav")?.classList.remove("is-open");
    });
  });
  document.querySelectorAll<HTMLButtonElement>(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetName = btn.dataset.preset;
      if (!presetName || !demoPresets[presetName]) return;
      const data = demoPresets[presetName];
      const form = document.querySelector("#predictionForm") as HTMLFormElement;
      if (!form) return;
      Object.entries(data).forEach(([key, value]) => {
        const input = form.querySelector(`input[name="${key}"]`) as HTMLInputElement;
        if (input) {
          input.value = String(value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  });
  document.querySelectorAll("#refreshData, [data-refresh]").forEach((element) => {
    element.addEventListener("click", () => loadRealtimeData().then(render));
  });
  document.querySelector("#reportSearch")?.addEventListener("input", (event) => {
    state.reportSearch = (event.currentTarget as HTMLInputElement).value;
    state.reportPage = 1;
    render();
  });
  document.querySelectorAll<HTMLElement>("[data-report-page]").forEach((element) => {
    element.addEventListener("click", () => {
      const direction = element.dataset.reportPage;
      state.reportPage = Math.max(1, state.reportPage + (direction === "next" ? 1 : -1));
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-settings-tab]").forEach((element) => {
    element.addEventListener("click", () => {
      state.settingsTab = element.dataset.settingsTab as typeof state.settingsTab;
      state.message = "";
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-chart-group]").forEach((element) => {
    element.addEventListener("click", () => {
      const key = element.dataset.chartKey || "ph";
      if (element.dataset.chartGroup === "eda") {
        state.edaMetric = key;
      }
      if (element.dataset.chartGroup === "analytics") {
        state.analyticsMetric = key;
      }
      render();
    });
  });
  document.querySelectorAll<HTMLElement>("[data-page]").forEach((element) => {
    element.addEventListener("click", () => {
      state.currentPage = element.dataset.page as AppPage;
      state.message = "";
      if (!state.session && state.currentPage === "home") {
        state.authMode = "login";
        render();
        return;
      }
      if (!state.session && state.currentPage !== "home") {
        state.authMode = "login";
        render();
        return;
      }
      if (state.session && !isProfileComplete() && !["home", "settings", "reset-password"].includes(state.currentPage)) {
        state.currentPage = "settings";
        state.settingsTab = "profile";
        state.message = "Lengkapi role dan bio profil sebelum mengakses fitur utama.";
        render();
        return;
      }
      if (["analytics", "reports", "eda"].includes(state.currentPage)) {
        loadRealtimeData().then(render);
      } else {
        render();
      }
    });
  });
  document.querySelectorAll<HTMLElement>("[data-auth-mode]").forEach((element) => {
    element.addEventListener("click", () => {
      state.authMode = element.dataset.authMode === "register" ? "register" : "login";
      state.currentPage = "login";
      state.message = "";
      render();
    });
  });
}

function toggleMode() {
  state.authMode = state.authMode === "login" ? "register" : "login";
  state.message = "";
  render();
}

async function handleAuthSubmit(event: Event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const fullName = String(formData.get("fullName") || "").trim();

  if (!email || !password || (state.authMode === "register" && !fullName)) {
    state.message = "Semua field wajib diisi.";
    render();
    return;
  }

  if (state.authMode === "register" && password !== confirmPassword) {
    state.message = "Konfirmasi password belum sama.";
    render();
    return;
  }

  state.loading = true;
  state.message = "";
  render();

  const response =
    state.authMode === "register"
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabase.auth.signInWithPassword({ email, password });

  state.loading = false;
  if (response.error) {
    state.message = response.error.message;
    render();
    return;
  }

  if (state.authMode === "register" && !response.data.session) {
    state.message = "Register berhasil. Cek email kamu untuk konfirmasi akun.";
    render();
    return;
  }

  state.session = response.data.session;
  await refreshUserData();
  if (
    state.authMode === "login" &&
    password === TEMPORARY_RESET_PASSWORD &&
    localStorage.getItem(TEMPORARY_RESET_EMAIL_KEY) === email.toLowerCase()
  ) {
    state.temporaryPasswordReset = true;
    state.currentPage = "settings";
    state.settingsTab = "security";
    state.message =
      "Anda login menggunakan password sementara hasil reset. Demi keamanan akun, segera ubah password Anda melalui form Change Password di bawah ini.";
  }
  render();
}

async function handlePredictionSubmit(event: Event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const payload: Record<string, number> = {};
  predictionFields.forEach(([name]) => {
    payload[name] = Number(formData.get(name));
  });

  if (Object.values(payload).some((value) => !Number.isFinite(value))) {
    state.message = label("invalidPredictionParams");
    render();
    return;
  }

  state.loading = true;
  state.message = "";
  render();

  try {
    state.latestPrediction = await runPrediction(payload, state.session?.access_token || null);
    state.predictionLogs = await loadPredictionLogs(state.session);
  } catch (error) {
    state.message = error instanceof Error ? error.message : label("predictionFailed");
  }

  state.loading = false;
  render();
}

function handlePredictionFormInput(event: Event) {
  const form = event.currentTarget as HTMLFormElement;
  const submitButton = form.querySelector<HTMLButtonElement>("#executePrediction");
  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>("input[type='number']"));
  const allValid = inputs.every((input) => {
    const value = input.value.trim();
    const valid = value !== "" && Number.isFinite(Number(value));
    input.classList.toggle("input-invalid", !valid);
    input.closest("label")?.querySelector(".input-error")?.classList.toggle("is-visible", !valid);
    return valid;
  });
  if (submitButton) submitButton.disabled = !allValid || state.loading;
}

async function handleBulkPredictionUpload(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  state.loading = true;
  state.message = "";
  render();

  try {
    const parsed = JSON.parse(await file.text());
    const rows = Array.isArray(parsed) ? parsed : parsed.data;
    if (!Array.isArray(rows) || !rows.length) {
      throw new Error(label("invalidJsonArray"));
    }

    const payload = rows.map((row) => {
      const record: Record<string, number> = {};
      predictionFields.forEach(([name]) => {
        record[name] = Number(row[name]);
      });
      if (Object.values(record).some((value) => !Number.isFinite(value))) {
        throw new Error(label("invalidJsonFields"));
      }
      return record;
    });

    const results = await runBatchPrediction(payload, state.session?.access_token || null);
    state.latestPrediction = results[0] || null;
    state.predictionLogs = await loadPredictionLogs(state.session);
    state.message = `${results.length} ${label("bulkPredictionSuccess")}`;
  } catch (error) {
    state.message = error instanceof Error ? error.message : label("bulkPredictionFailed");
  }

  state.loading = false;
  render();
}

function handleDownloadReportsCsv() {
  if (!state.predictionLogs.length) {
    state.message = "Belum ada report untuk di-export.";
    render();
    return;
  }

  const header = ["created_at", "status", "ph", "temperature", "dissolved_oxygen_mg_l"];
  const rows = state.predictionLogs.map((log) =>
    [
      log.created_at,
      log.predicted_suitability_tier,
      log.input_data?.ph ?? "",
      log.input_data?.temperature ?? "",
      log.input_data?.dissolved_oxygen_mg_l ?? "",
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "satria-prediction-reports.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function handleForgotPassword() {
  const email = document.querySelector<HTMLInputElement>("#email")?.value.trim();
  if (!email) {
    state.message = "Isi email dulu untuk reset password.";
    render();
    return;
  }

  state.loading = true;
  state.message = "";
  render();

  try {
    state.message = await requestTemporaryPasswordReset(email);
    localStorage.setItem(TEMPORARY_RESET_EMAIL_KEY, email.toLowerCase());
  } catch (error) {
    state.message = error instanceof Error ? error.message : "Reset password gagal diproses.";
  }

  state.loading = false;
  render();
}

function getPredictionJsonExample() {
  const row = predictionFields.reduce<Record<string, number>>((acc, [name, , example]) => {
    acc[name] = example;
    return acc;
  }, {});
  return JSON.stringify([row], null, 2);
}

async function handleCopyJsonExample() {
  const json = getPredictionJsonExample();
  try {
    await navigator.clipboard.writeText(json);
    state.message = label("jsonCopied");
  } catch {
    state.message = json;
  }
  render();
}

function handleDownloadSampleJson() {
  const url = URL.createObjectURL(new Blob([getPredictionJsonExample()], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sample.json";
  link.click();
  URL.revokeObjectURL(url);
  state.message = label("jsonDownloaded");
  render();
}

async function handleResetPasswordSubmit(event: Event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const password = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!password || password.length < 6) {
    state.message = "Password minimal 6 karakter.";
    render();
    return;
  }

  if (password !== confirmPassword) {
    state.message = "Konfirmasi password tidak sama.";
    render();
    return;
  }

  state.loading = true;
  state.message = "";
  render();

  const { error } = await supabase.auth.updateUser({ password });
  state.loading = false;

  if (error) {
    state.message = error.message;
    render();
    return;
  }

  state.message = "Password berhasil diperbarui. Silakan login kembali.";
  await supabase.auth.signOut();
  state.session = null;
  state.currentPage = "login";
  state.authMode = "login";
  render();
}

async function handleProfileSave(event: Event) {
  event.preventDefault();
  if (!state.session) return;

  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const role = String(formData.get("role") || "").trim();
  const organization = String(formData.get("organization") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  if (!role || !organization || !bio) {
    state.message = "Role, Organization, dan Bio wajib diisi sebelum mengakses fitur utama.";
    render();
    return;
  }

  state.loading = true;
  state.message = "";
  render();

  try {
    state.profile = await saveProfile(state.session, formData);
    state.message = "Profile berhasil disimpan ke Supabase.";
    if (isProfileComplete()) {
      state.currentPage = "prediction";
    }
  } catch (error) {
    state.message = error instanceof Error ? error.message : "Profile gagal disimpan.";
  }

  state.loading = false;
  render();
}

async function handleSecuritySave(event: Event) {
  event.preventDefault();
  if (!state.session) return;
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const password = String(formData.get("newPassword") || "");

  state.loading = true;
  state.message = "";
  render();

  try {
    const profile = await saveSecuritySettings(state.session, formData);
    state.profile = profile || (await loadProfile(state.session));
    if (password && state.temporaryPasswordReset) {
      localStorage.removeItem(TEMPORARY_RESET_EMAIL_KEY);
      state.temporaryPasswordReset = false;
    }
    state.message = "Security & Privacy berhasil diperbarui.";
  } catch (error) {
    state.message = error instanceof Error ? error.message : "Security & Privacy gagal disimpan.";
  }

  state.loading = false;
  render();
}

async function handleLogout() {
  await supabase.auth.signOut();
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  state.session = null;
  state.profile = null;
  state.predictionLogs = [];
  state.userRiskCount = 0;
  state.latestPrediction = null;
  state.realtimeConnected = false;
  state.currentPage = "home";
  render();
}

async function refreshUserData() {
  state.profile = await loadProfile(state.session);
  state.modelInfo = await loadModelInfo();
  await loadRealtimeData();
  setupRealtimeSubscriptions();
  state.temporaryPasswordReset = Boolean(
    state.session?.user.email && localStorage.getItem(TEMPORARY_RESET_EMAIL_KEY) === state.session.user.email.toLowerCase(),
  );
  if (state.session && state.temporaryPasswordReset) {
    state.currentPage = "settings";
    state.settingsTab = "security";
    state.message =
      "Anda login menggunakan password sementara hasil reset. Demi keamanan akun, segera ubah password Anda melalui form Change Password di bawah ini.";
  } else if (state.session && !isProfileComplete()) {
    state.currentPage = "settings";
    state.settingsTab = "profile";
    state.message = "Lengkapi role dan bio profil sebelum menggunakan fitur utama.";
  }
}

function isProfileComplete() {
  return Boolean(state.profile?.role?.trim() && state.profile?.organization?.trim() && state.profile?.bio?.trim());
}

async function loadRealtimeData() {
  const [predictionLogs, edaRows, edaTotalRows, userRiskCount] = await Promise.all([
    loadPredictionLogs(state.session),
    loadEdaRows(),
    loadEdaRowCount(),
    loadUserRiskCount(state.session),
  ]);
  state.predictionLogs = predictionLogs;
  state.edaRows = edaRows;
  state.edaTotalRows = edaTotalRows || edaRows.length;
  state.userRiskCount = userRiskCount;
}

function setupRealtimeSubscriptions() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  if (!state.session) {
    state.realtimeConnected = false;
    return;
  }

  realtimeChannel = supabase
    .channel(`satria-realtime-${state.session.user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "prediction_results",
        filter: `user_id=eq.${state.session.user.id}`,
      },
      () => loadRealtimeData().then(render),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "water_quality_clean",
      },
      () => loadRealtimeData().then(render),
    )
    .subscribe((status) => {
      state.realtimeConnected = status === "SUBSCRIBED";
      render();
    });
}

function isRecoveryRoute() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("reset-password") === "1" || hash.get("type") === "recovery";
}

supabase.auth.getSession().then(({ data }) => {
  state.session = data.session;
  if (isRecoveryRoute()) {
    state.currentPage = "reset-password";
    window.history.replaceState({}, "", window.location.pathname);
  }
  refreshUserData().then(render);
});

supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession: Session | null) => {
  state.session = nextSession;
  if (event === "PASSWORD_RECOVERY") {
    state.currentPage = "reset-password";
    window.history.replaceState({}, "", window.location.pathname);
  }
  refreshUserData().then(render);
});
