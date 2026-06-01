import { API_BASE_URL } from "../constants";
import type { ModelInfo, PredictionResult } from "../types";

export async function runPrediction(payload: Record<string, number>) {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload, save_to_supabase: false }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as PredictionResult;
}

export async function loadModelInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/model-info`);
    if (!response.ok) return null;
    return (await response.json()) as ModelInfo;
  } catch {
    return null;
  }
}
