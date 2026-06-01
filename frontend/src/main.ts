import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { predictionFields } from "./constants";
import { runPrediction } from "./services/api";
import {
  loadEdaRows,
  loadPredictionLogs,
  loadProfile,
  savePredictionLog,
  saveProfile,
} from "./services/supabaseData";
import { supabase } from "./services/supabase";
import { state } from "./state";
import type { AppPage } from "./types";
import { renderApp } from "./views/appView";
import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Root app element tidak ditemukan.");
}

function render() {
  app.innerHTML = renderApp(state);
  bindEvents();
}

function bindEvents() {
  document.querySelector("#toggleModeTop")?.addEventListener("click", toggleMode);
  document.querySelector("#toggleModeBottom")?.addEventListener("click", toggleMode);
  document.querySelector("#forgotPassword")?.addEventListener("click", handleForgotPassword);
  document.querySelector("#logoutButton")?.addEventListener("click", handleLogout);
  document.querySelector("#authForm")?.addEventListener("submit", handleAuthSubmit);
  document.querySelector("#predictionForm")?.addEventListener("submit", handlePredictionSubmit);
  document.querySelector("#profileForm")?.addEventListener("submit", handleProfileSave);
  document.querySelector("#refreshData")?.addEventListener("click", () => loadRealtimeData().then(render));
  document.querySelectorAll<HTMLElement>("[data-page]").forEach((element) => {
    element.addEventListener("click", () => {
      state.currentPage = element.dataset.page as AppPage;
      state.message = "";
      if (["analytics", "reports", "eda"].includes(state.currentPage)) {
        loadRealtimeData().then(render);
      } else {
        render();
      }
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
  const fullName = String(formData.get("fullName") || "").trim();

  if (!email || !password || (state.authMode === "register" && !fullName)) {
    state.message = "Semua field wajib diisi.";
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
  render();
}

async function handlePredictionSubmit(event: Event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget as HTMLFormElement);
  const payload: Record<string, number> = {};
  predictionFields.forEach(([name]) => {
    payload[name] = Number(formData.get(name));
  });

  state.loading = true;
  state.message = "";
  render();

  try {
    state.latestPrediction = await runPrediction(payload);
    await savePredictionLog(state.session, payload, state.latestPrediction);
    state.predictionLogs = await loadPredictionLogs(state.session);
  } catch (error) {
    state.message = error instanceof Error ? error.message : "Prediksi gagal.";
  }

  state.loading = false;
  render();
}

async function handleForgotPassword() {
  const email = document.querySelector<HTMLInputElement>("#email")?.value.trim();
  if (!email) {
    state.message = "Isi email dulu untuk reset password.";
    render();
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  state.message = error ? error.message : "Link reset password dikirim ke email kamu.";
  render();
}

async function handleProfileSave(event: Event) {
  event.preventDefault();
  if (!state.session) return;

  state.loading = true;
  state.message = "";
  render();

  try {
    state.profile = await saveProfile(state.session, new FormData(event.currentTarget as HTMLFormElement));
    state.message = "Profile berhasil disimpan ke Supabase.";
  } catch (error) {
    state.message = error instanceof Error ? error.message : "Profile gagal disimpan.";
  }

  state.loading = false;
  render();
}

async function handleLogout() {
  await supabase.auth.signOut();
  state.session = null;
  state.profile = null;
  state.predictionLogs = [];
  state.latestPrediction = null;
  state.currentPage = "home";
  render();
}

async function refreshUserData() {
  state.profile = await loadProfile(state.session);
  await loadRealtimeData();
}

async function loadRealtimeData() {
  const [predictionLogs, edaRows] = await Promise.all([
    loadPredictionLogs(state.session),
    loadEdaRows(),
  ]);
  state.predictionLogs = predictionLogs;
  state.edaRows = edaRows;
}

supabase.auth.getSession().then(({ data }) => {
  state.session = data.session;
  refreshUserData().then(render);
});

supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
  state.session = nextSession;
  refreshUserData().then(render);
});
