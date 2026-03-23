const STORAGE_KEY = 'redev-weights';

export const DEFAULT_WEIGHTS = {
  'Market Risk': 25,
  'Financial Risk': 25,
  'Regulatory Risk': 20,
  'Environmental Risk': 15,
  'Infrastructure Risk': 15,
};

export const PRESETS = {
  balanced: { ...DEFAULT_WEIGHTS },
  conservative: {
    'Market Risk': 15,
    'Financial Risk': 20,
    'Regulatory Risk': 20,
    'Environmental Risk': 25,
    'Infrastructure Risk': 20,
  },
  aggressive: {
    'Market Risk': 35,
    'Financial Risk': 30,
    'Regulatory Risk': 15,
    'Environmental Risk': 10,
    'Infrastructure Risk': 10,
  },
};

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A+' },
  { min: 85, grade: 'A' },
  { min: 80, grade: 'A-' },
  { min: 75, grade: 'B+' },
  { min: 70, grade: 'B' },
  { min: 65, grade: 'B-' },
  { min: 60, grade: 'C+' },
  { min: 55, grade: 'C' },
  { min: 50, grade: 'C-' },
  { min: 0,  grade: 'D' },
];

export function loadWeights() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_WEIGHTS };
    const parsed = JSON.parse(stored);
    // Validate: must have all keys
    for (const k of Object.keys(DEFAULT_WEIGHTS)) {
      if (typeof parsed[k] !== 'number') return { ...DEFAULT_WEIGHTS };
    }
    return parsed;
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
}

export function saveWeights(weights) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  } catch { /* quota exceeded, ignore */ }
}

// Non-linear: penalize high risk more heavily (exponent > 1)
function riskToScore(riskScore) {
  const linear = (10 - riskScore) / 9; // 0..1
  const curved = Math.pow(linear, 1.2); // steeper drop for high risk
  return curved * 100;
}

export function recalcScore(risks, weights, options = {}) {
  if (!Array.isArray(risks) || risks.length === 0) {
    return { overallScore: 50, investmentGrade: 'C-', scoreBreakdown: [] };
  }

  const riskMap = {};
  for (const r of risks) {
    if (r.category && typeof r.score === 'number') riskMap[r.category] = r.score;
  }

  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  if (totalWeight === 0) {
    return { overallScore: 50, investmentGrade: 'C-', scoreBreakdown: [] };
  }

  const breakdown = [];
  let weightedSum = 0;

  for (const [category, weight] of Object.entries(weights)) {
    const riskScore = riskMap[category];
    if (typeof riskScore !== 'number' || riskScore < 1 || riskScore > 10) continue;

    const componentScore = riskToScore(riskScore);
    const normalizedWeight = weight / totalWeight;
    const weighted = componentScore * normalizedWeight;

    breakdown.push({
      category,
      riskScore,
      componentScore: Math.round(componentScore * 10) / 10,
      weight: Math.round(weight),
      weightedScore: Math.round(weighted * 10) / 10,
    });

    weightedSum += weighted;
  }

  // Market trend bonus
  let trendBonus = 0;
  const trend = options.marketTrend?.toLowerCase();
  if (trend === 'appreciating') trendBonus = 3;
  else if (trend === 'declining') trendBonus = -3;

  const raw = weightedSum + trendBonus;
  const overallScore = Math.max(1, Math.min(100, Math.round(raw)));

  let investmentGrade = 'D';
  for (const t of GRADE_THRESHOLDS) {
    if (overallScore >= t.min) { investmentGrade = t.grade; break; }
  }

  return { overallScore, investmentGrade, scoreBreakdown: breakdown, trendBonus };
}
