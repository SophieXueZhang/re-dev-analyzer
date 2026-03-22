import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

function getRiskColor(level) {
  if (level === 'low') return { bg: '#10b981', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' };
  if (level === 'medium') return { bg: '#f59e0b', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' };
  return { bg: '#ef4444', text: 'text-red-700', badge: 'bg-red-100 text-red-700' };
}

function RiskItem({ risk }) {
  const [expanded, setExpanded] = useState(false);
  const color = getRiskColor(risk.level);
  const { t } = useI18n();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Risk meter mini */}
        <div className="flex-shrink-0 w-12">
          <div className="risk-meter">
            <div
              className="risk-meter-fill"
              style={{ width: `${risk.score * 10}%`, backgroundColor: color.bg }}
            />
          </div>
          <div className={`text-xs font-bold mt-1 text-center ${color.text}`}>{risk.score}/10</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{risk.category}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.badge}`}>
              {t(`risk.${risk.level}`)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{risk.description}</p>
        </div>

        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <p className="text-sm text-slate-600 mt-3 mb-3">{risk.description}</p>
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('risk.mitigationStrategies')}</h5>
            <ul className="space-y-1.5">
              {risk.mitigations.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiskPanel({ risks }) {
  const avgScore = (risks.reduce((sum, r) => sum + r.score, 0) / risks.length).toFixed(1);
  const highRisks = risks.filter(r => r.level === 'high').length;
  const { t } = useI18n();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-slide-up stagger-3">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t('risk.title')}</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {t('risk.avgScore')} <span className="font-bold text-slate-700">{avgScore}/10</span>
          </span>
          {highRisks > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
              <AlertTriangle className="w-3 h-3" />
              {t('risk.highRisk', { count: highRisks })}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {risks.map((risk, i) => (
          <RiskItem key={i} risk={risk} />
        ))}
      </div>
    </div>
  );
}
