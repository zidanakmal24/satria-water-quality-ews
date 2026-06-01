import { API_BASE_URL } from "../constants";
import type { PredictionResult } from "../types";

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
