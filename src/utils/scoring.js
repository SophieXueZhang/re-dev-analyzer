export const DEFAULT_WEIGHTS = {
  'Market Risk': 25,
  'Financial Risk': 25,
  'Regulatory Risk': 20,
  'Environmental Risk': 15,
  'Infrastructure Risk': 15,
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

export function recalcScore(risks, weights) {
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

    const componentScore = ((10 - riskScore) / 9) * 100;
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

  const overallScore = Math.max(1, Math.min(100, Math.round(weightedSum)));

  let investmentGrade = 'D';
  for (const t of GRADE_THRESHOLDS) {
    if (overallScore >= t.min) { investmentGrade = t.grade; break; }
  }

  return { overallScore, investmentGrade, scoreBreakdown: breakdown };
}
