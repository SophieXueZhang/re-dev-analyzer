import { MapPin, GraduationCap, Shield, Users, Building2, Bus } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const CRIME_STYLES = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MODERATE: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
};

const GRADE_COLORS = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-brand-100 text-brand-700',
  C: 'bg-amber-100 text-amber-700',
  D: 'bg-red-100 text-red-700',
  F: 'bg-red-100 text-red-700',
};

function getScoreColor(score) {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#3b82f6';
  if (score >= 25) return '#f59e0b';
  return '#ef4444';
}

export default function NeighborhoodProfile({ profile }) {
  const { t } = useI18n();
  if (!profile) return null;

  const walkScore = typeof profile.walkScore === 'number' ? profile.walkScore : null;
  const schoolGrade = (profile.schoolQuality || '')[0]?.toUpperCase();
  const crimeKey = (profile.crimeLevel || '').split(' ')[0].toUpperCase();
  const crimeStyle = CRIME_STYLES[crimeKey] || CRIME_STYLES.MODERATE;
  const gradeStyle = GRADE_COLORS[schoolGrade] || GRADE_COLORS.C;
  const employers = profile.majorEmployers || [];
  const trend = profile.demographicTrend || '';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-4">
      <div className="flex items-center gap-2 mb-5">
        <MapPin className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">{t('neighborhood.title')}</h3>
      </div>

      {/* Top row: Walk Score + School + Crime */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Walk Score */}
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 mb-2">{t('neighborhood.walkScore')}</div>
          {walkScore !== null ? (
            <>
              <div className="relative mx-auto w-14 h-14 mb-1">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke={getScoreColor(walkScore)}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - walkScore / 100)}
                    transform="rotate(-90 28 28)"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: getScoreColor(walkScore) }}>
                  {walkScore}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">--</div>
          )}
        </div>

        {/* School Quality */}
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 mb-2">{t('neighborhood.schools')}</div>
          <div className="flex flex-col items-center gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${gradeStyle}`}>
              <GraduationCap className="w-3.5 h-3.5" />
              {schoolGrade || '--'}
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-2">{profile.schoolQuality}</span>
          </div>
        </div>

        {/* Crime Level */}
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <div className="text-xs text-slate-500 mb-2">{t('neighborhood.crime')}</div>
          <div className="flex flex-col items-center gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${crimeStyle}`}>
              <Shield className="w-3.5 h-3.5" />
              {crimeKey || '--'}
            </span>
            <span className="text-[10px] text-slate-400 line-clamp-2">{profile.crimeLevel}</span>
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="space-y-3">
        {/* Demographics */}
        {trend && (
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3">
            <Users className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-0.5">{t('neighborhood.demographics')}</div>
              <div className="text-sm text-slate-700">{trend}</div>
            </div>
          </div>
        )}

        {/* Major Employers */}
        {employers.length > 0 && (
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-0.5">{t('neighborhood.employers')}</div>
              <div className="text-sm text-slate-700">{employers.join(' / ')}</div>
            </div>
          </div>
        )}

        {/* Commute */}
        {profile.commuteAccess && (
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3">
            <Bus className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-0.5">{t('neighborhood.commute')}</div>
              <div className="text-sm text-slate-700">{profile.commuteAccess}</div>
            </div>
          </div>
        )}

        {/* Supply Pipeline */}
        {profile.supplyPipeline && (
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3">
            <Building2 className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-0.5">{t('neighborhood.supply')}</div>
              <div className="text-sm text-slate-700">{profile.supplyPipeline}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
