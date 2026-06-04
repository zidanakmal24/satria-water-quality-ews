import type { Session } from "@supabase/supabase-js";

export type AuthMode = "login" | "register";
export type AppPage = "home" | "login" | "prediction" | "analytics" | "reports" | "eda" | "settings";
export type SettingsTab = "profile" | "security" | "privacy";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  organization: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export type PredictionResult = {
  predicted_class_id: number;
  predicted_suitability_tier: string;
  probabilities: Record<string, number>;
};

export type ModelInfo = {
  model_name?: string;
  features?: string[];
  classes?: string[];
  metrics?: Record<string, number>;
};

export type PredictionLog = {
  id: number;
  created_at: string;
  user_id: string | null;
  input_data: Record<string, number>;
  predicted_suitability_tier: string;
  probabilities: Record<string, number> | null;
};

export type EdaRecord = Record<string, string | number | null | undefined>;

// ─── EDA derived types ────────────────────────────────────────────────────────

export type DataShape = {
  rows: number;
  cols: number;
  columns: string[];
};

export type NullInfo = {
  column: string;
  nullCount: number;
  nullPct: number;
};

export type ColumnTypeSummary = {
  column: string;
  inferredType: "numeric" | "categorical" | "boolean" | "mixed" | "empty";
  uniqueCount: number;
};

export type ColumnStats = {
  column: string;
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
};

export type OutlierInfo = {
  column: string;
  lowerFence: number;
  upperFence: number;
  outlierCount: number;
  outlierPct: number;
  outlierIndices: number[];
};

export type EdaStats = {
  // summary scalars (legacy-compatible)
  rows: number;
  features: number;
  missingPct: number;
  avgPh: number;
  tempMean: number;
  doMean: number;
  ammoniaMean: number;
  nitriteMean: number;

  // structured EDA
  shape: DataShape;
  head: EdaRecord[];
  tail: EdaRecord[];
  nullInfo: NullInfo[];
  totalNullCount: number;
  totalNullPct: number;
  columnTypes: ColumnTypeSummary[];
  numericStats: ColumnStats[];
  outliers: OutlierInfo[];
};

// ─── App state ────────────────────────────────────────────────────────────────

export type AppState = {
  authMode: AuthMode;
  currentPage: AppPage;
  loading: boolean;
  message: string;
  session: Session | null;
  profile: Profile | null;
  latestPrediction: PredictionResult | null;
  modelInfo: ModelInfo | null;
  predictionLogs: PredictionLog[];
  edaStats: EdaStats | null;       // replaces edaRows + edaTotalRows
  edaLoading: boolean;
  userRiskCount: number;
  realtimeConnected: boolean;
  edaMetric: string;
  analyticsMetric: string;
  settingsTab: SettingsTab;
  reportSearch: string;
};