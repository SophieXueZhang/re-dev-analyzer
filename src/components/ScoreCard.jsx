import { TrendingUp, Award, Database } from 'lucide-react';

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
  const { overallScore, investmentGrade, quickTake, property } = data;
  const scoreColor = getScoreColor(overallScore);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (overallScore / 100) * circumference;

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
              style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: scoreColor }}>{overallScore}</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900">{property.address}</h3>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor(investmentGrade)}`}>
              <Award className="w-4 h-4" />
              Grade {investmentGrade}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
              {property.county} County
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
              <TrendingUp className="w-3 h-3" />
              {data.valuation.marketTrend}
            </span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">{quickTake}</p>
          {data.dataSources && data.dataSources.length > 0 && (
            <div className="mt-3 flex items-start gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-400">
                Data sources: {data.dataSources.join(' | ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
