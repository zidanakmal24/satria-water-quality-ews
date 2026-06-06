import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { EdaRecord, PredictionLog, Profile } from "../types";
import { API_BASE_URL } from "../constants";

export async function loadProfile(session: Session | null) {
  const user = session?.user;
  if (!user) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/profiles`, {
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    });
    if (!response.ok) return null;
    return (await response.json()) as Profile;
  } catch (error) {
    console.error("Failed to load profile:", error);
    return null;
  }
}

export async function saveProfile(session: Session, formData: FormData) {
  const updates = {
    full_name: String(formData.get("fullName") || "").trim(),
    role: String(formData.get("role") || "").trim(),
    organization: String(formData.get("organization") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
  };

  const response = await fetch(`${API_BASE_URL}/profiles`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const saved = (await response.json()) as Profile;

  // Sync with Supabase Auth metadata
  await supabase.auth.updateUser({
    data: {
      full_name: updates.full_name,
      role: updates.role,
      organization: updates.organization,
      bio: updates.bio,
    },
  });

  return saved;
}

export async function saveSecuritySettings(session: Session, formData: FormData) {
  const fullName = String(formData.get("securityFullName") || "").trim();
  const password = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!fullName) throw new Error("Username / nama user wajib diisi.");
  if (password && password.length < 6) throw new Error("Password minimal 6 karakter.");
  if (password !== confirmPassword) throw new Error("Konfirmasi password tidak sama.");

  const authUpdates: { password?: string; data: { full_name: string } } = { data: { full_name: fullName } };
  if (password) authUpdates.password = password;

  const { error: authError } = await supabase.auth.updateUser(authUpdates);
  if (authError) throw authError;

  const response = await fetch(`${API_BASE_URL}/profiles`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ full_name: fullName }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as Profile;
}

export async function loadPredictionLogs(session: Session | null) {
  if (!session) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/logs?limit=100`, {
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    });
    if (!response.ok) return [];
    return (await response.json()) as PredictionLog[];
  } catch (error) {
    console.error("Failed to load prediction logs:", error);
    return [];
  }
}

export async function loadUserRiskCount(session: Session | null) {
  if (!session) return 0;

  try {
    const response = await fetch(`${API_BASE_URL}/logs/risk-count`, {
      headers: {
        "Authorization": `Bearer ${session.access_token}`
      }
    });
    if (!response.ok) return 0;
    const res = await response.json();
    return res.risk_count || 0;
  } catch (error) {
    console.error("Failed to load user risk count:", error);
    return 0;
  }
}

export async function loadEdaRows() {
  try {
    const response = await fetch(`${API_BASE_URL}/eda/rows?limit=1000`);
    if (!response.ok) return [];
    const res = await response.json();
    return (res.data || []) as EdaRecord[];
  } catch (error) {
    console.error("Failed to load EDA rows:", error);
    return [];
  }
}

export async function loadEdaRowCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/eda/count`);
    if (!response.ok) return 0;
    const res = await response.json();
    return res.count || 0;
  } catch (error) {
    console.error("Failed to load EDA row count:", error);
    return 0;
  }
}
