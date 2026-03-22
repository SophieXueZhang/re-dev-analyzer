import { Landmark, BookOpen, CheckSquare, XSquare, AlertCircle, Ruler, FileText } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

function Tag({ children, color }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-brand-50 text-brand-700 border-brand-200',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

export default function ZoningPanel({ zoning }) {
  const { t } = useI18n();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-slide-up stagger-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
          <Landmark className="w-5 h-5 text-violet-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{t('zoning.title')}</h3>
      </div>

      {/* Zoning classification header */}
      <div className="bg-slate-50 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-brand-700">{zoning.classification}</span>
          <span className="text-sm text-slate-500">{zoning.description}</span>
        </div>
        {zoning.overlayDistricts && zoning.overlayDistricts.length > 0 && zoning.overlayDistricts[0] && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-400">{t('zoning.overlayDistricts')}</span>
            {zoning.overlayDistricts.map((d, i) => (
              <Tag key={i} color="blue">{d}</Tag>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Permitted Uses */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              {t('zoning.permittedUses')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {zoning.permittedUses.map((u, i) => (
                <Tag key={i} color="green">{u}</Tag>
              ))}
            </div>
          </div>

          {/* Conditional Uses */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              {t('zoning.conditionalUses')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {zoning.conditionalUses.map((u, i) => (
                <Tag key={i} color="amber">{u}</Tag>
              ))}
            </div>
          </div>

          {/* Prohibited Uses */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <XSquare className="w-4 h-4 text-red-500" />
              {t('zoning.prohibitedUses')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {zoning.prohibitedUses.map((u, i) => (
                <Tag key={i} color="red">{u}</Tag>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Building Restrictions */}
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Ruler className="w-4 h-4 text-slate-400" />
              {t('zoning.buildingRestrictions')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(zoning.buildingRestrictions).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 text-xs">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </span>
                  <span className="font-medium text-slate-800 text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Local Codes */}
      <div className="mt-5">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <FileText className="w-4 h-4 text-slate-400" />
          {t('zoning.localCodes')}
        </h4>
        <div className="space-y-2">
          {zoning.localCodes.map((code, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-shrink-0 px-2 py-1 bg-brand-100 text-brand-700 rounded text-xs font-mono font-bold">
                {code.code}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">{code.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{code.relevance}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Changes */}
      {zoning.recentChanges && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-medium text-amber-800">{t('zoning.recentChanges')}</span>
          </div>
          <p className="text-sm text-amber-700 mt-1 ml-6">{zoning.recentChanges}</p>
        </div>
      )}

      {/* Development Potential */}
      <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-semibold text-brand-800">{t('zoning.developmentPotential')}</span>
        </div>
        <p className="text-sm text-brand-700 ml-6">{zoning.developmentPotential}</p>
      </div>
    </div>
  );
}
