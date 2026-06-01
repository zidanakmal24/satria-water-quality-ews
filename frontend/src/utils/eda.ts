import type { EdaRecord } from "../types";

export function average(rows: EdaRecord[], column: string) {
  const values = rows.map((row) => Number(row[column])).filter(Number.isFinite);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function computeEdaStats(rowsData: EdaRecord[]) {
  const rows = rowsData.length;
  const cols = rows ? Object.keys(rowsData[0]) : [];
  const numericCols = cols.filter((col) => typeof rowsData[0]?.[col] === "number");
  const missing = rowsData.reduce(
    (sum, row) => sum + cols.filter((col) => row[col] === null || row[col] === "").length,
    0,
  );
  const totalCells = Math.max(rows * Math.max(cols.length, 1), 1);
  const avgPh = average(rowsData, "ph");

  return {
    rows,
    features: numericCols.length || 14,
    missingPct: (missing / totalCells) * 100,
    avgPh: Number.isFinite(avgPh) ? avgPh : 0,
    tempMean: average(rowsData, "temperature"),
    doMean: average(rowsData, "dissolved_oxygen_mg_l"),
    ammoniaMean: average(rowsData, "ammonia_mg_l_1"),
    nitriteMean: average(rowsData, "nitrite_mg_l_1"),
  };
}
