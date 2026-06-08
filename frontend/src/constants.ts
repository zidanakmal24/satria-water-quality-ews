export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";
export const HERO_LOGO_PATH = "/assets/satria-aquaculture-logo.jpeg";

export const predictionFields = [
  ["temperature", "Temperature", 24.94],
  ["turbidity_cm", "Turbidity", 54.38],
  ["dissolved_oxygen_mg_l", "Dissolved Oxygen", 4.01],
  ["biochemical_oxygen_demand_mg_l", "Organic Matter / BOD", 1.5],
  ["carbon_dioxide_co2", "Carbon Dioxide", 6.47],
  ["ph", "pH", 7.81],
  ["total_alkalinity_mg_l_1", "Alkalinity", 63.42],
  ["total_hardness_mg_l_1", "Hardness", 112.35],
  ["calcium_mg_l_1", "Calcium", 62.77],
  ["ammonia_mg_l_1", "Ammonia", 0.012],
  ["nitrite_mg_l_1", "Nitrite", 0.01],
  ["phosphorus_mg_l_1", "Phosphorus", 0.975],
  ["hydrogen_sulfide_mg_l_1", "Hydrogen Sulfide", 0.0195],
  ["plankton_count_no_l_1", "Plankton Count", 3728],
] as const;

export const numericParameters = [
  { key: "temperature", label: "Temperature", unit: "C" },
  { key: "ph", label: "pH", unit: "" },
  { key: "dissolved_oxygen_mg_l", label: "Dissolved Oxygen", unit: "mg/L" },
  { key: "ammonia_mg_l_1", label: "Ammonia", unit: "mg/L" },
  { key: "nitrite_mg_l_1", label: "Nitrite", unit: "mg/L" },
  { key: "phosphorus_mg_l_1", label: "Phosphorus", unit: "mg/L" },
  { key: "total_hardness_mg_l_1", label: "Hardness", unit: "mg/L" },
  { key: "total_alkalinity_mg_l_1", label: "Alkalinity", unit: "mg/L" },
] as const;

export const demoPresets: Record<string, Record<string, number>> = {
  optimal: {
    temperature: 24.92,
    turbidity_cm: 54.46,
    dissolved_oxygen_mg_l: 4.01,
    biochemical_oxygen_demand_mg_l: 1.50,
    carbon_dioxide_co2: 6.48,
    ph: 7.79,
    total_alkalinity_mg_l_1: 63.02,
    total_hardness_mg_l_1: 112.78,
    calcium_mg_l_1: 62.69,
    ammonia_mg_l_1: 0.012,
    nitrite_mg_l_1: 0.010,
    phosphorus_mg_l_1: 0.998,
    hydrogen_sulfide_mg_l_1: 0.019,
    plankton_count_no_l_1: 3728,
  },
  moderate: {
    temperature: 25.02,
    turbidity_cm: 22.53,
    dissolved_oxygen_mg_l: 58.29,
    biochemical_oxygen_demand_mg_l: 36.97,
    carbon_dioxide_co2: 51.42,
    ph: 71.14,
    total_alkalinity_mg_l_1: 848.78,
    total_hardness_mg_l_1: 1228.25,
    calcium_mg_l_1: 882.65,
    ammonia_mg_l_1: 0.037,
    nitrite_mg_l_1: 7.18,
    phosphorus_mg_l_1: 11.46,
    hydrogen_sulfide_mg_l_1: 0.01,
    plankton_count_no_l_1: 3889,
  },
  critical: {
    temperature: 27.04,
    turbidity_cm: 40.08,
    dissolved_oxygen_mg_l: 5.43,
    biochemical_oxygen_demand_mg_l: 3.81,
    carbon_dioxide_co2: 6.90,
    ph: 7.61,
    total_alkalinity_mg_l_1: 122.86,
    total_hardness_mg_l_1: 132.54,
    calcium_mg_l_1: 94.32,
    ammonia_mg_l_1: 0.092,
    nitrite_mg_l_1: 0.889,
    phosphorus_mg_l_1: 1.25,
    hydrogen_sulfide_mg_l_1: 0.02,
    plankton_count_no_l_1: 110634,
  }
};
