import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { EdaRecord, PredictionLog, PredictionResult, Profile } from "../types";

export async function loadProfile(session: Session | null) {
  const user = session?.user;
  if (!user) return null;

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
  if (error || !data) {
    const { data: inserted } = await supabase.from("profiles").upsert(fallback).select("*").single();
    return ((inserted as Profile) || fallback) as Profile;
  }

  return data as Profile;
}

export async function saveProfile(session: Session, formData: FormData) {
  const updates = {
    id: session.user.id,
    email: session.user.email || "",
    full_name: String(formData.get("fullName") || "").trim(),
    role: String(formData.get("role") || "").trim(),
    organization: String(formData.get("organization") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("profiles").upsert(updates).select("*").single();
  if (error) throw error;

  await supabase.auth.updateUser({ data: updates });
  return data as Profile;
}

export async function savePredictionLog(
  session: Session | null,
  inputData: Record<string, number>,
  result: PredictionResult,
) {
  const userId = session?.user.id;
  if (!userId) return;

  await supabase.from("prediction_results").insert({
    user_id: userId,
    input_data: inputData,
    predicted_class_id: result.predicted_class_id,
    predicted_suitability_tier: result.predicted_suitability_tier,
    probabilities: result.probabilities,
  });
}

export async function loadPredictionLogs(session: Session | null) {
  const userId = session?.user.id;
  if (!userId) return [];

  const { data } = await supabase
    .from("prediction_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []) as PredictionLog[];
}

export async function loadEdaRows() {
  const { data } = await supabase.from("water_quality_clean").select("*").limit(1000);
  return (data || []) as EdaRecord[];
}
