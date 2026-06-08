# Frontend EDA Visualization Implementation

## Overview
Enhanced `frontend/src/utils/eda.ts` to produce comprehensive Exploratory Data Analysis (EDA) visualizations in the frontend, copying key analysis from the PBL_eda_pycaret_report.html.

## New Exports

### 1. **Dataset Overview Table** (`renderDataInfoTable`)
Displays key dataset statistics:
- Total rows and columns
- Total missing values and percentage
- Per-column missing count and data type detection
- Non-null counts per column

**Features:**
- Badge-based data type detection (numeric, object, boolean)
- Color-coded table with hover effects
- Responsive grid layout for info cards

**Usage:**
```typescript
import { renderDataInfoTable } from "./utils/eda";
const htmlContent = renderDataInfoTable(waterQualityRows);
```

---

### 2. **Correlation Heatmap** (`renderCorrelationHeatmap`)
Generates a Pearson correlation matrix between numeric water quality parameters.

**Parameters Included:**
- Temperature, pH, Dissolved Oxygen, Ammonia, Nitrite, Phosphorus, Hydrogen Sulfide, Turbidity

**Features:**
- Color-coded cells (blue for positive, orange for negative correlations)
- Intensity scale based on correlation strength
- Rotated column headers for readability
- Interactive hover effects with value display
- Interpretation guide

**Correlation Interpretation:**
- Values close to **1**: Strong positive correlation
- Values close to **-1**: Strong negative correlation
- Values close to **0**: No correlation

**Usage:**
```typescript
import { renderCorrelationHeatmap } from "./utils/eda";
const heatmapHtml = renderCorrelationHeatmap(waterQualityRows);
```

---

### 3. **pH Distribution Chart** (`renderPhDistribution`)
Displays pH values sorted from highest to lowest frequency.

**Features:**
- Top 12 pH bin ranges (sorted by count descending)
- Bar height proportional to frequency
- Percentage and count display
- Gradient bar colors with hover effects
- Responsive grid layout

**Usage:**
```typescript
import { renderPhDistribution } from "./utils/eda";
const phChart = renderPhDistribution(waterQualityRows);
```

---

### 4. **Outlier Analysis** (`renderOutlierAnalysis`)
Detects outliers using the Interquartile Range (IQR) method.

**Detection Method:**
- Q1: 25th percentile
- Q3: 75th percentile
- IQR = Q3 - Q1
- Lower bound: Q1 - 1.5 × IQR
- Upper bound: Q3 + 1.5 × IQR
- Values outside bounds = outliers

**Parameters Analyzed:** Top 6 numeric water quality parameters

**Features:**
- Grid layout of outlier cards
- Per-parameter quartile and IQR values
- Outlier count and percentage
- Highlights parameter with most outliers
- Color-coded cards with warning styling

**Usage:**
```typescript
import { renderOutlierAnalysis } from "./utils/eda";
const outlierHtml = renderOutlierAnalysis(waterQualityRows);
```

---

### 5. **Suitability Tier Distribution** (`renderClassDistribution`)
Shows class balance for the aquaculture suitability target variable.

**Classes:**
- **Optimal Suitability** (Green: #0fb5a5)
- **Moderate Suitability** (Yellow: #ffc700)
- **Reduced Suitability** (Red: #ff7a59)

**Features:**
- Percentage breakdown per class
- Stacked bar visualization
- Count display
- Color-coded tier badges
- Balanced dataset indicator

**Usage:**
```typescript
import { renderClassDistribution } from "./utils/eda";
const classDistHtml = renderClassDistribution(waterQualityRows);
```

---

## Integration Example

```typescript
// In appView.ts or similar component
import { 
  computeEdaStats,
  renderDataInfoTable,
  renderCorrelationHeatmap,
  renderPhDistribution,
  renderOutlierAnalysis,
  renderClassDistribution 
} from "./utils/eda";

export function renderEDADashboard(rows: EdaRecord[]): string {
  return `
    <div class="eda-dashboard">
      <h2>Exploratory Data Analysis - Water Quality Dataset</h2>
      
      ${renderDataInfoTable(rows)}
      
      <div class="eda-grid">
        <div class="eda-grid-item">
          ${renderCorrelationHeatmap(rows)}
        </div>
        <div class="eda-grid-item">
          ${renderOutlierAnalysis(rows)}
        </div>
      </div>
      
      ${renderPhDistribution(rows)}
      
      ${renderClassDistribution(rows)}
    </div>
  `;
}
```

---

## Data Processing Functions

### Helper Functions
All visualization functions rely on:

- **`mean(values)`** - Calculates arithmetic mean
- **`getNumericColumn(rows, candidates)`** - Extracts numeric values with fallback column names
- **`pearsonCorrelation(a, b)`** - Computes Pearson correlation coefficient
- **`getPercentile(sorted, pct)`** - Calculates percentile values

---

## CSS Styling

New CSS classes added to `styles.css`:

- `.eda-section` - Main container styling
- `.info-grid` / `.info-card` - Dataset overview cards
- `.data-table` - Table styling with hover effects
- `.heatmap-table` - Correlation matrix styling
- `.ph-distribution-bars` - Bar chart grid
- `.ph-bar-item` / `.bar-container` / `.bar` - Bar components
- `.outlier-grid` / `.outlier-card` - Outlier cards
- `.class-distribution` / `.distribution-table` - Class distribution
- `.chart-help` - Help text styling

**Responsive Breakpoints:**
- Desktop (1024px+): Full grid layouts
- Tablet (640px-1024px): 2-column layouts
- Mobile (<640px): Single column, adjusted spacing

---

## Data Mapping

All visualizations work with `EdaRecord[]` arrays where:

```typescript
interface EdaRecord {
  [key: string]: string | number | null | undefined;
  
  // Water Quality Parameters
  temperature?: number;
  ph?: number;
  dissolved_oxygen_mg_l?: number;
  ammonia_mg_l_1?: number;
  nitrite_mg_l_1?: number;
  phosphorus_mg_l_1?: number;
  hydrogen_sulfide_mg_l_1?: number;
  turbidity_cm?: number;
  carbon_dioxide_mg_l_1?: number;
  biochemical_oxygen_demand_mg_l?: number;
  total_alkalinity_mg_l_1?: number;
  total_hardness_mg_l_1?: number;
  calcium_mg_l_1?: number;
  plankton_count_no_l_1?: number;
  
  // Classification
  aquaculture_suitability_tier?: string;
  aquaculture_suitability_description?: string;
}
```

---

## Performance Considerations

- **Correlation Matrix**: O(n × m²) where n = rows, m = parameters
- **Outlier Detection**: O(n × m log m) due to sorting
- **Distribution Rendering**: O(n × m) with minimal sorting

For large datasets (>10K rows):
- Consider limiting correlation to core parameters
- Use data sampling for distribution rendering
- Implement virtualization for large tables

---

## Notes

- No interactions chart is included (as requested)
- All visualizations accept clean data according to the water quality schema
- Color scheme aligns with project design (Satria Water Quality EWS)
- Styling is fully responsive for mobile/tablet/desktop
- Follows existing project conventions and typography

---

## Files Modified

1. **`frontend/src/utils/eda.ts`** - Added 5 new visualization functions
2. **`frontend/src/styles.css`** - Added ~400 lines of CSS styling

## Files Unchanged

- `frontend/src/views/charts.ts` - Existing chart functions remain intact
- Type definitions - Uses existing `EdaRecord` type

