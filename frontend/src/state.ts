import type { AppState } from "./types";

const storedLanguage = typeof localStorage !== "undefined" && localStorage.getItem("satria_language") === "en" ? "en" : "id";

export const state: AppState = {
  language: storedLanguage,
  authMode: "login",
  currentPage: "home",
  loading: false,
  message: "",
  session: null,
  profile: null,
  latestPrediction: null,
  modelInfo: null,
  predictionLogs: [],
  edaRows: [],
  edaTotalRows: 0,
  userRiskCount: 0,
  temporaryPasswordReset: false,
  realtimeConnected: false,
  edaMetric: "ph",
  analyticsMetric: "dissolved_oxygen_mg_l",
  settingsTab: "profile",
  reportSearch: "",
  reportPage: 1,
};
