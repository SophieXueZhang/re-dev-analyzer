const RISK_WEIGHTS = {
  'Market Risk': 0.25,
  'Financial Risk': 0.25,
  'Regulatory Risk': 0.20,
  'Environmental Risk': 0.15,
  'Infrastructure Risk': 0.15,
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

export function calculateOverallScore(risks) {
  if (!Array.isArray(risks) || risks.length === 0) {
    return { overallScore: 50, investmentGrade: 'C-', scoreBreakdown: [] };
  }

  const riskMap = {};
  for (const r of risks) {
    if (r.category && typeof r.score === 'number') riskMap[r.category] = r.score;
  }

  const breakdown = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [category, weight] of Object.entries(RISK_WEIGHTS)) {
    const riskScore = riskMap[category];
    if (typeof riskScore !== 'number' || riskScore < 1 || riskScore > 10) continue;

    const componentScore = Math.pow((10 - riskScore) / 9, 1.2) * 100;
    const weighted = componentScore * weight;

    breakdown.push({
      category,
      riskScore,
      componentScore: Math.round(componentScore * 10) / 10,
      weight: Math.round(weight * 100),
      weightedScore: Math.round(weighted * 10) / 10,
    });

    weightedSum += weighted;
    totalWeight += weight;
  }

  const raw = totalWeight > 0 ? weightedSum / totalWeight : 50;
  const overallScore = Math.max(1, Math.min(100, Math.round(raw)));

  let investmentGrade = 'D';
  for (const t of GRADE_THRESHOLDS) {
    if (overallScore >= t.min) { investmentGrade = t.grade; break; }
  }

  return { overallScore, investmentGrade, scoreBreakdown: breakdown };
}

export { RISK_WEIGHTS, GRADE_THRESHOLDS };
