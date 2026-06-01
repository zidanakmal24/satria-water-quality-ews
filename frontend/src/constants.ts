export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
export const HERO_LOGO_PATH = "/assets/satria-aquaculture-logo.png";

export const predictionFields = [
  ["temperature", "Temperature", 28],
  ["turbidity_cm", "Turbidity", 45],
  ["dissolved_oxygen_mg_l", "Dissolved Oxygen", 6.8],
  ["biochemical_oxygen_demand_mg_l", "Organic Matter / BOD", 3.2],
  ["carbon_dioxide_co2", "Carbon Dioxide", 8.4],
  ["ph", "pH", 7.4],
  ["total_alkalinity_mg_l_1", "Alkalinity", 120],
  ["total_hardness_mg_l_1", "Hardness", 180],
  ["calcium_mg_l_1", "Calcium", 70],
  ["ammonia_mg_l_1", "Ammonia", 0.05],
  ["nitrite_mg_l_1", "Nitrite", 0.02],
  ["phosphorus_mg_l_1", "Phosphorus", 0.3],
  ["hydrogen_sulfide_mg_l_1", "Hydrogen Sulfide", 0.01],
  ["plankton_count_no_l_1", "Plankton Count", 2500],
] as const;
