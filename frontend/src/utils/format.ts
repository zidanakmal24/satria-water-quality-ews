import type { AppState } from "../types";

export function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getDisplayName(state: AppState) {
  return (
    state.profile?.full_name ||
    state.session?.user.user_metadata?.full_name ||
    state.session?.user.email?.split("@")[0] ||
    "SATRIA User"
  );
}

export function statusClass(value: string) {
  const text = value.toLowerCase();
  if (text.includes("optimal")) return "optimal";
  if (text.includes("moderate")) return "moderate";
  return "unsafe";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value > 9999 ? "compact" : "standard",
  }).format(value);
}
