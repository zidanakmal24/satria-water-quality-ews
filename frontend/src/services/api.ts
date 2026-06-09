import { API_BASE_URL } from "../constants";
import type { ModelInfo, PredictionResult } from "../types";

/**
 * Mengirim satu set data kualitas air ke API Gateway untuk mendapatkan hasil prediksi klasifikasi.
 * Akan menyertakan header otentikasi jika token pengguna diberikan.
 */
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

/**
 * Mengirim banyak set data sekaligus ke API Gateway untuk prediksi secara *batch*.
 * Mengembalikan susunan (*array*) hasil prediksi masing-masing data.
 */
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

/**
 * Memuat informasi metadata dari model *Machine Learning* yang sedang aktif di backend
 * (misal: versi model, fitur yang dibutuhkan, dan kelas klasifikasi).
 */
export async function loadModelInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/model-info`);
    if (!response.ok) return null;
    return (await response.json()) as ModelInfo;
  } catch {
    return null;
  }
}

export async function requestTemporaryPasswordReset(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Reset password gagal diproses.");
  }

  return String(data.message || "Password berhasil di-reset. Password sementara 12345678 sudah dikirim ke email kamu.");
}
