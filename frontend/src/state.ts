import type { AppState } from "./types";

export const state: AppState = {
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
  edaMetric: "ph",
  analyticsMetric: "dissolved_oxygen_mg_l",
  settingsTab: "profile",
  reportSearch: "",
};
