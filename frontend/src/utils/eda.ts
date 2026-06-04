import type { EdaRecord } from "../types";

export type ComputedEdaStats = {
  rows: number;
  features: number;
  missingPct: number;
  avgPh: number;
  tempMean: number;
  doMean: number;
  ammoniaMean: number;
  nitriteMean: number;
};

function mean(values: number[]): number {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;
}

function getNumericColumn(
  rows: EdaRecord[],
  candidates: string[]
): number[] {
  const values: number[] = [];

  for (const row of rows) {
    for (const key of candidates) {
      if (!(key in row)) continue;

      const num = Number(row[key]);

      if (Number.isFinite(num)) {
        values.push(num);
      }

      break;
    }
  }

  return values;
}

export function computeEdaStats(
  rows: EdaRecord[]
): ComputedEdaStats {
  const columns =
    rows.length > 0 ? Object.keys(rows[0]) : [];

  let missing = 0;

  rows.forEach((row) => {
    Object.values(row).forEach((value) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        missing++;
      }
    });
  });

  const totalCells =
    rows.length * Math.max(columns.length, 1);

  return {
    rows: rows.length,
    features: columns.length,

    missingPct:
      totalCells === 0
        ? 0
        : (missing / totalCells) * 100,

    avgPh: mean(
      getNumericColumn(rows, ["ph", "pH"])
    ),

    tempMean: mean(
      getNumericColumn(rows, [
        "temperature",
        "temperature_c",
      ])
    ),

    doMean: mean(
      getNumericColumn(rows, [
        "do",
        "dissolved_oxygen_mg_l",
      ])
    ),

    ammoniaMean: mean(
      getNumericColumn(rows, [
        "ammonia",
        "ammonia_mg_l",
      ])
    ),

    nitriteMean: mean(
      getNumericColumn(rows, [
        "nitrite",
        "nitrite_mg_l",
      ])
    ),
  };
}