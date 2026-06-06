import { API_BASE_URL } from "../constants";
import type { ModelInfo, PredictionResult } from "../types";

export async function runPrediction(payload: Record<string, number>, token: string | null = null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: payload }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as PredictionResult;
}

export async function runBatchPrediction(payload: Record<string, number>[], token: string | null = null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/predict/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: payload }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as PredictionResult[];
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
