import React from 'react';
import { DollarSign, Home, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

function StatBox({ label, value, icon: Icon, accent }) {
  const colors = {
    blue: 'bg-brand-50 text-brand-700 border-brand-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 opacity-60" />}
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export default function ValuationPanel({ valuation }) {
  const trendIcon = valuation.marketTrend === 'appreciating' ? ArrowUpRight
    : valuation.marketTrend === 'declining' ? ArrowDownRight : Minus;
  const { t } = useI18n();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-slide-up stagger-2">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-brand-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{t('valuation.title')}</h3>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatBox label={t('valuation.estValue')} value={valuation.estimatedValue} icon={DollarSign} accent="blue" />
        <StatBox label={t('valuation.priceSqFt')} value={valuation.pricePerSqFt} icon={Home} accent="blue" />
        <StatBox label={t('valuation.capRate')} value={valuation.capRate} icon={TrendingUp} accent="green" />
        <StatBox label={t('valuation.cashOnCash')} value={valuation.cashOnCashReturn} icon={DollarSign} accent="green" />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mb-5 text-sm">
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.propertyType')}</span>
          <span className="font-medium text-slate-800">{valuation.propertyType}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.estSqFt')}</span>
          <span className="font-medium text-slate-800">{valuation.estimatedSqFt}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.lotSize')}</span>
          <span className="font-medium text-slate-800">{valuation.lotSize}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.yearBuilt')}</span>
          <span className="font-medium text-slate-800">{valuation.yearBuilt}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.grm')}</span>
          <span className="font-medium text-slate-800">{valuation.grossRentMultiplier}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.noiEst')}</span>
          <span className="font-medium text-slate-800">{valuation.noiEstimate}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.monthlyRent')}</span>
          <span className="font-medium text-slate-800">{valuation.estimatedMonthlyRent}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.appreciation')}</span>
          <span className="font-medium text-slate-800 flex items-center gap-1">
            {React.createElement(trendIcon, { className: 'w-3.5 h-3.5' })}
            {valuation.annualAppreciation}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">{t('valuation.market')}</span>
          <span className="font-medium text-slate-800 capitalize">{valuation.marketTrend}</span>
        </div>
      </div>

      {/* Comparables */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          {t('valuation.comparables')}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="pb-2 pr-4 font-medium">{t('valuation.thAddress')}</th>
                <th className="pb-2 pr-4 font-medium">{t('valuation.thPrice')}</th>
                <th className="pb-2 pr-4 font-medium">{t('valuation.thSqFt')}</th>
                <th className="pb-2 pr-4 font-medium">{t('valuation.thPriceSqFt')}</th>
                <th className="pb-2 font-medium">{t('valuation.thSold')}</th>
              </tr>
            </thead>
            <tbody>
              {valuation.comparables.map((comp, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">{comp.address}</td>
                  <td className="py-2 pr-4 font-medium text-slate-800">{comp.price}</td>
                  <td className="py-2 pr-4 text-slate-600">{comp.sqft}</td>
                  <td className="py-2 pr-4 text-slate-600">{comp.priceSqFt}</td>
                  <td className="py-2 text-slate-500">{comp.soldDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600 italic">{valuation.summary}</p>
      </div>
    </div>
  );
}
