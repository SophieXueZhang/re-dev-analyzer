import { ShieldCheck, ShieldAlert, Target, TrendingUp, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const VERDICT_STYLES = {
  BUY: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-600', icon: ShieldCheck },
  HOLD: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-500', icon: Target },
  AVOID: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-600', icon: ShieldAlert },
};

const CONFIDENCE_COLORS = {
  HIGH: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-slate-100 text-slate-600',
};

export default function InvestmentThesis({ thesis }) {
  const { t } = useI18n();
  if (!thesis) return null;

  const verdict = (thesis.verdict || '').toUpperCase();
  const style = VERDICT_STYLES[verdict] || VERDICT_STYLES.HOLD;
  const VerdictIcon = style.icon;
  const confidence = (thesis.confidence || '').toUpperCase();
  const confStyle = CONFIDENCE_COLORS[confidence] || CONFIDENCE_COLORS.MEDIUM;

  const greenFlags = thesis.greenFlags || [];
  const redFlags = thesis.redFlags || [];
  const actionItems = thesis.actionItems || [];

  return (
    <div className={`rounded-2xl shadow-sm border ${style.border} ${style.bg} p-6 sm:p-8 animate-slide-up stagger-2`}>
      {/* Header: Verdict + Confidence + Target */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-lg ${style.badge}`}>
            <VerdictIcon className="w-5 h-5" />
            {t(`thesis.${verdict.toLowerCase()}`) || verdict}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${confStyle}`}>
            {t(`thesis.confidence_${confidence.toLowerCase()}`) || confidence}
          </span>
        </div>
        {thesis.targetInvestor && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/60 text-slate-600 rounded-full text-sm border border-slate-200">
            <Target className="w-3.5 h-3.5" />
            {thesis.targetInvestor}
          </span>
        )}
      </div>

      {/* One-liner */}
      {thesis.oneLiner && (
        <p className={`text-lg font-medium ${style.text} mb-6 leading-relaxed`}>
          {thesis.oneLiner}
        </p>
      )}

      {/* Green Flags / Red Flags */}
      {(greenFlags.length > 0 || redFlags.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {greenFlags.length > 0 && (
            <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
              <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                {t('thesis.greenFlags')}
              </h4>
              <ul className="space-y-2">
                {greenFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {redFlags.length > 0 && (
            <div className="bg-white/70 rounded-xl p-4 border border-red-100">
              <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 mb-3">
                <AlertTriangle className="w-4 h-4" />
                {t('thesis.redFlags')}
              </h4>
              <ul className="space-y-2">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="bg-white/70 rounded-xl p-4 border border-slate-200">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
            <ArrowRight className="w-4 h-4" />
            {t('thesis.actionItems')}
          </h4>
          <ol className="space-y-2">
            {actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
