import { TrendingUp, Award, Database, Calculator, RotateCcw } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { DEFAULT_WEIGHTS, PRESETS, recalcScore, loadWeights, saveWeights } from '../utils/scoring';
import RadarChart from './RadarChart';

function getGradeColor(grade) {
  if (grade.startsWith('A')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (grade.startsWith('B')) return 'text-brand-600 bg-brand-50 border-brand-200';
  if (grade.startsWith('C')) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function getScoreColor(score) {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#3b82f6';
  if (score >= 30) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreCard({ data }) {
  const { quickTake, property, risks } = data;
  const { t, language } = useI18n();
  const [weights, setWeights] = useState(() => loadWeights());

  // Persist to localStorage on change
  useEffect(() => { saveWeights(weights); }, [weights]);

  const isCustom = useMemo(
    () => Object.keys(DEFAULT_WEIGHTS).some(k => weights[k] !== DEFAULT_WEIGHTS[k]),
    [weights],
  );

  const marketTrend = data.valuation?.marketTrend;
  const scoreOpts = useMemo(() => ({ marketTrend }), [marketTrend]);

  const { overallScore, investmentGrade, scoreBreakdown, trendBonus } = useMemo(
    () => recalcScore(risks, weights, scoreOpts),
    [risks, weights, scoreOpts],
  );

  // Default score for diff comparison
  const defaultResult = useMemo(
    () => recalcScore(risks, DEFAULT_WEIGHTS, scoreOpts),
    [risks, scoreOpts],
  );
  const scoreDiff = overallScore - defaultResult.overallScore;

  const scoreColor = getScoreColor(overallScore);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (overallScore / 100) * circumference;

  const handleWeightChange = useCallback((category, value) => {
    setWeights(prev => ({ ...prev, [category]: Number(value) }));
  }, []);

  const applyPreset = useCallback((presetKey) => {
    setWeights({ ...PRESETS[presetKey] });
  }, []);

  const activePreset = useMemo(() => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (Object.keys(preset).every(k => weights[k] === preset[k])) return key;
    }
    return null;
  }, [weights]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-1">
      {/* Top: Score Ring + Property Info */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Score Ring */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            {/* Benchmark line at 55 (median reference) */}
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray={`${(55 / 100) * circumference} ${circumference}`}
              strokeDashoffset={0}
              transform="rotate(-90 64 64)"
              opacity={0.5}
            />
            <circle
              cx="64" cy="64" r="54"
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: scoreColor }}>{overallScore}</span>
            {isCustom && scoreDiff !== 0 && (
              <span className={`text-xs font-semibold ${scoreDiff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {scoreDiff > 0 ? '+' : ''}{scoreDiff}
              </span>
            )}
            {(!isCustom || scoreDiff === 0) && (
              <span className="text-xs text-slate-400">{t('score.outOf')}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900">{property.address}</h3>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor(investmentGrade)}`}>
              <Award className="w-4 h-4" />
              {t('score.grade', { grade: investmentGrade })}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
              {t('score.county', { county: property.county })}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
              <TrendingUp className="w-3 h-3" />
              {marketTrend}
            </span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">{quickTake}</p>
          {data.dataSources && data.dataSources.length > 0 && (
            <div className="mt-3 flex items-start gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                {t('score.dataSources')} {data.dataSources.join(' | ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Score Breakdown */}
      {scoreBreakdown && scoreBreakdown.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          {/* Header: Title + Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <Calculator className="w-4 h-4" />
              <span>{t('score.breakdownTitle')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {Object.keys(PRESETS).map(key => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    activePreset === key
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {t(`score.preset_${key}`)}
                </button>
              ))}
              {isCustom && !activePreset && (
                <button
                  onClick={() => applyPreset('balanced')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('score.reset')}
                </button>
              )}
            </div>
          </div>

          {/* Radar + Sliders side by side */}
          <div className="flex flex-col md:flex-row gap-5">
            {/* Radar Chart */}
            <div className="flex justify-center md:justify-start flex-shrink-0">
              <RadarChart breakdown={scoreBreakdown} size={200} lang={language} />
            </div>

            {/* Weight Sliders */}
            <div className="flex-1 space-y-2.5">
              {scoreBreakdown.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg px-3 py-2">
                  {/* Row 1: Category + Risk + Weighted Score */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">{item.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {t('score.riskScore')} {item.riskScore}/10
                      </span>
                      <span className="text-xs font-bold w-10 text-right tabular-nums" style={{ color: getScoreColor(item.componentScore) }}>
                        {item.weightedScore}
                      </span>
                    </div>
                  </div>
                  {/* Row 2: Slider */}
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={weights[item.category]}
                      onChange={e => handleWeightChange(item.category, e.target.value)}
                      className="flex-1 h-1.5 accent-brand-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 w-10 text-right tabular-nums">{item.weight}%</span>
                  </div>
                </div>
              ))}

              {/* Market Trend Bonus */}
              {trendBonus !== 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                  <span className="text-slate-500">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {t('score.trendBonus')}
                  </span>
                  <span className={`font-semibold ${trendBonus > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {trendBonus > 0 ? '+' : ''}{trendBonus}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 px-3">
                <span className="text-sm font-semibold text-slate-700">{t('score.total')}</span>
                <div className="flex items-center gap-2">
                  {isCustom && scoreDiff !== 0 && (
                    <span className={`text-xs font-medium ${scoreDiff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                    </span>
                  )}
                  <span className="text-lg font-bold" style={{ color: scoreColor }}>
                    {overallScore}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
