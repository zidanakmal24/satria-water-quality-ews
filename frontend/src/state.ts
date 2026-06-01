import type { AppState } from "./types";

export const state: AppState = {
  authMode: "login",
  currentPage: "home",
  loading: false,
  message: "",
  session: null,
  profile: null,
  latestPrediction: null,
  predictionLogs: [],
  edaRows: [],
};
