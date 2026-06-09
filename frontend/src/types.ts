import type { Session } from "@supabase/supabase-js";

export type AuthMode = "login" | "register";
export type AppPage = "home" | "login" | "prediction" | "analytics" | "reports" | "eda" | "settings" | "reset-password";
export type SettingsTab = "profile" | "security" | "privacy";
export type Language = "id" | "en";

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

export type EdaRecord = Record<string, string | number | null>;

export type AppState = {
  language: Language;
  authMode: AuthMode;
  currentPage: AppPage;
  loading: boolean;
  message: string;
  session: Session | null;
  profile: Profile | null;
  latestPrediction: PredictionResult | null;
  modelInfo: ModelInfo | null;
  predictionLogs: PredictionLog[];
  edaRows: EdaRecord[];
  edaTotalRows: number;
  userRiskCount: number;
  temporaryPasswordReset: boolean;
  realtimeConnected: boolean;
  edaMetric: string;
  analyticsMetric: string;
  settingsTab: SettingsTab;
  reportSearch: string;
  reportPage: number;
};
