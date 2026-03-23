import { MapPin, Layers, Droplets, FileText, Shield, ArrowUpRight, Building2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
  return 0;
}

function fmt(n) {
  if (!n && n !== 0) return '--';
  return n < 0
    ? `-$${Math.abs(Math.round(n)).toLocaleString()}`
    : `$${Math.round(n).toLocaleString()}`;
}

const FLOOD_COLORS = {
  NONE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  LOW: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MODERATE: { bg: 'bg-amber-100', text: 'text-amber-700' },
  HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
};

const ALIGNMENT_COLORS = {
  ALIGNED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  POTENTIAL_UPZONE: { bg: 'bg-blue-100', text: 'text-blue-700' },
  MISALIGNED: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export default function LandUseAnalysis({ landUse }) {
  const { t } = useI18n();
  if (!landUse) return null;

  const far = landUse.farUtilization || {};
  const density = landUse.densityAnalysis || {};
  const transit = landUse.transitAccess || {};
  const env = landUse.environmentalOverlay || {};
  const future = landUse.futureLandUse || {};
  const reg = landUse.regulatoryBurden || {};

  const floodStyle = FLOOD_COLORS[env.floodRisk] || FLOOD_COLORS.NONE;
  const alignStyle = ALIGNMENT_COLORS[future.zoningAlignment] || ALIGNMENT_COLORS.ALIGNED;

  const utilizationPct = parseNum(far.utilizationPct);
  const unusedFAR = parseNum(far.unusedFAR);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-6">
      <div className="flex items-center gap-2 mb-5">
        <MapPin className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">{t('landUse.title')}</h3>
      </div>

      {/* FAR Utilization - Visual Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">{t('landUse.farUtilization')}</span>
          <span className="text-xs text-slate-500">
            {far.currentFAR != null ? parseNum(far.currentFAR).toFixed(2) : '--'} / {far.maxFAR != null ? parseNum(far.maxFAR).toFixed(2) : '--'} FAR
          </span>
        </div>
        <div className="h-5 bg-slate-100 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, utilizationPct))}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
            {utilizationPct > 0 ? `${utilizationPct.toFixed(0)}% ${t('landUse.used')}` : '--'}
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-400">
            {t('landUse.airRights')}: {far.airRightsSqFt ? `${Math.round(parseNum(far.airRightsSqFt)).toLocaleString()} sqft` : '--'}
          </span>
          <span className="text-[10px] text-slate-400">
            {t('landUse.unusedFAR')}: {unusedFAR > 0 ? unusedFAR.toFixed(2) : '--'}
          </span>
        </div>
      </div>

      {/* Key Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Flood Zone */}
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <Droplets className={`w-4 h-4 mx-auto mb-1 ${floodStyle.text}`} />
          <div className="text-xs text-slate-500 mb-0.5">{t('landUse.floodZone')}</div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${floodStyle.bg} ${floodStyle.text}`}>
            {env.femaFloodZone || '--'}
          </span>
        </div>

        {/* Zoning Alignment */}
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <Layers className={`w-4 h-4 mx-auto mb-1 ${alignStyle.text}`} />
          <div className="text-xs text-slate-500 mb-0.5">{t('landUse.zoningAlign')}</div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${alignStyle.bg} ${alignStyle.text}`}>
            {t(`landUse.align_${(future.zoningAlignment || 'unknown').toLowerCase()}`)}
          </span>
        </div>

        {/* Transit / TOD */}
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <ArrowUpRight className="w-4 h-4 mx-auto mb-1 text-slate-500" />
          <div className="text-xs text-slate-500 mb-0.5">{t('landUse.transit')}</div>
          <div className="text-xs font-bold text-slate-700">
            {transit.distanceMiles != null ? `${parseNum(transit.distanceMiles).toFixed(1)} mi` : '--'}
          </div>
          {transit.todEligible && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 mt-0.5">TOD</span>
          )}
        </div>

        {/* Historic */}
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <Shield className="w-4 h-4 mx-auto mb-1 text-slate-500" />
          <div className="text-xs text-slate-500 mb-0.5">{t('landUse.historic')}</div>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
            reg.historicOverlay === 'YES' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>
            {reg.historicOverlay === 'YES' ? t('landUse.yes') : t('landUse.no')}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Density Analysis */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {t('landUse.density')}
          </div>
          <InfoRow label={t('landUse.currentDensity')} value={density.currentUnitsPerAcre != null ? `${parseNum(density.currentUnitsPerAcre).toFixed(1)} ${t('landUse.unitsPerAcre')}` : '--'} />
          <InfoRow label={t('landUse.maxDensity')} value={density.maxAllowedDensity || '--'} />
          <InfoRow label={t('landUse.popDensity')} value={density.populationDensity || '--'} />
          <InfoRow label={t('landUse.context')} value={density.densityContext || '--'} />
        </div>

        {/* Environmental Overlay */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5" />
            {t('landUse.envOverlay')}
          </div>
          <InfoRow label={t('landUse.floodRisk')} value={env.floodRisk || '--'} color={floodStyle.text} />
          <InfoRow label={t('landUse.wetlands')} value={env.wetlands || '--'} />
          <InfoRow label={t('landUse.brownfield')} value={env.brownfieldStatus || '--'} />
          <InfoRow label={t('landUse.envReview')} value={env.environmentalReview || '--'} />
        </div>

        {/* Future Land Use */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {t('landUse.futureLandUse')}
          </div>
          <InfoRow label={t('landUse.compPlan')} value={future.compPlanDesignation || '--'} />
          <InfoRow label={t('landUse.rezoneLikelihood')} value={future.rezoningLikelihood || '--'}
            color={future.rezoningLikelihood === 'HIGH' ? 'text-emerald-600' : future.rezoningLikelihood === 'MEDIUM' ? 'text-amber-600' : 'text-slate-600'} />
          {future.upzoneContext && (
            <p className="text-[10px] text-slate-400 italic mt-1">{future.upzoneContext}</p>
          )}
        </div>

        {/* Regulatory Burden */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {t('landUse.regulatory')}
          </div>
          <InfoRow label={t('landUse.impactFees')} value={reg.estimatedImpactFees ? fmt(parseNum(reg.estimatedImpactFees)) : '--'} />
          <InfoRow label={t('landUse.inclusionary')} value={reg.inclusionaryHousing || '--'} />
          {reg.historicConstraints && reg.historicOverlay === 'YES' && (
            <p className="text-[10px] text-slate-400 italic mt-1">{reg.historicConstraints}</p>
          )}
        </div>
      </div>

      {/* Transit & Non-conforming bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {transit.nearestTransit && (
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400">{t('landUse.nearestTransit')}</div>
            <div className="text-xs font-medium text-slate-700">{transit.nearestTransit}</div>
            {transit.transitContext && <div className="text-[10px] text-slate-400 mt-0.5">{transit.transitContext}</div>}
          </div>
        )}
        {landUse.nonConformingStatus && (
          <div className="bg-slate-50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-slate-400">{t('landUse.nonConforming')}</div>
            <div className={`text-xs font-medium ${
              landUse.nonConformingStatus.includes('LEGAL_NONCONFORMING') ? 'text-amber-600' : 'text-slate-700'
            }`}>{landUse.nonConformingStatus}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-[10px] text-slate-400 flex-shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${color || 'text-slate-700'}`}>{value}</span>
    </div>
  );
}
