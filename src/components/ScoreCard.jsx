import { TrendingUp, Award, Database, Calculator, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { DEFAULT_WEIGHTS, recalcScore } from '../utils/scoring';

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
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [weights, setWeights] = useState(() => ({ ...DEFAULT_WEIGHTS }));

  const isCustom = useMemo(
    () => Object.keys(DEFAULT_WEIGHTS).some(k => weights[k] !== DEFAULT_WEIGHTS[k]),
    [weights],
  );

  const { overallScore, investmentGrade, scoreBreakdown } = useMemo(
    () => recalcScore(risks, weights),
    [risks, weights],
  );

  const scoreColor = getScoreColor(overallScore);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (overallScore / 100) * circumference;

  const handleWeightChange = useCallback((category, value) => {
    setWeights(prev => ({ ...prev, [category]: Number(value) }));
  }, []);

  const resetWeights = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
    setEditing(false);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-1">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Score Ring */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
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
            <span className="text-xs text-slate-400">{t('score.outOf')}</span>
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
              {data.valuation.marketTrend}
            </span>
            {isCustom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs border border-amber-200">
                <SlidersHorizontal className="w-3 h-3" />
                {t('score.customWeights')}
              </span>
            )}
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
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <Calculator className="w-4 h-4" />
              <span>{t('score.breakdownTitle')}</span>
            </div>
            <div className="flex items-center gap-2">
              {isCustom && (
                <button
                  onClick={resetWeights}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('score.reset')}
                </button>
              )}
              <button
                onClick={() => setEditing(!editing)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                  editing
                    ? 'bg-brand-50 text-brand-600 border border-brand-200'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                {t('score.adjustWeights')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 font-medium px-2">
              <div className={editing ? 'col-span-3' : 'col-span-4'}>{t('score.category')}</div>
              <div className="col-span-2 text-center">{t('score.riskScore')}</div>
              <div className="col-span-2 text-center">{t('score.componentScore')}</div>
              <div className={`text-center ${editing ? 'col-span-3' : 'col-span-2'}`}>{t('score.weight')}</div>
              <div className="col-span-2 text-right">{t('score.weighted')}</div>
            </div>
            {/* Rows */}
            {scoreBreakdown.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 text-xs items-center bg-slate-50 rounded-lg px-2 py-1.5">
                <div className={`font-medium text-slate-700 ${editing ? 'col-span-3' : 'col-span-4'}`}>
                  {item.category}
                </div>
                <div className="col-span-2 text-center text-slate-500">{item.riskScore}/10</div>
                <div className="col-span-2 text-center text-slate-500">{item.componentScore}</div>
                <div className={`flex items-center justify-center gap-1 ${editing ? 'col-span-3' : 'col-span-2'}`}>
                  {editing ? (
                    <>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={weights[item.category]}
                        onChange={e => handleWeightChange(item.category, e.target.value)}
                        className="w-16 h-1 accent-brand-500"
                      />
                      <span className="text-slate-500 w-8 text-right tabular-nums">{weights[item.category]}%</span>
                    </>
                  ) : (
                    <span className="text-slate-400">{item.weight}%</span>
                  )}
                </div>
                <div className="col-span-2 text-right font-semibold" style={{ color: getScoreColor(item.componentScore) }}>
                  {item.weightedScore}
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="grid grid-cols-12 gap-2 text-sm items-center border-t border-slate-200 pt-2 px-2">
              <div className="col-span-10 font-semibold text-slate-700">{t('score.total')}</div>
              <div className="col-span-2 text-right font-bold text-lg" style={{ color: scoreColor }}>
                {overallScore}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
