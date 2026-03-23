import { Activity, Clock, BarChart3, TrendingDown, Home, DollarSign, Scale, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const MARKET_STYLES = {
  SELLER: { bg: 'bg-red-100', text: 'text-red-700', label: 'seller' },
  BALANCED: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'balanced' },
  BUYER: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'buyer' },
};

function parseNum(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || null;
  return null;
}

function DOMGauge({ days }) {
  if (days == null) return null;
  // 0-15 hot, 15-30 warm, 30-60 normal, 60+ cold
  const pct = Math.min(days / 90, 1);
  const color = days <= 15 ? '#ef4444' : days <= 30 ? '#f59e0b' : days <= 60 ? '#3b82f6' : '#6b7280';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between w-full text-[9px] text-slate-400">
        <span>Hot</span><span>Normal</span><span>Cold</span>
      </div>
    </div>
  );
}

function InventoryGauge({ months }) {
  if (months == null) return null;
  // <3 seller, 3-6 balanced, >6 buyer
  const color = months < 3 ? '#ef4444' : months <= 6 ? '#f59e0b' : '#10b981';
  const pct = Math.min(months / 12, 1);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between w-full text-[9px] text-slate-400">
        <span>Seller</span><span>Balanced</span><span>Buyer</span>
      </div>
    </div>
  );
}

export default function MarketPulse({ marketActivity, valuation }) {
  const { t } = useI18n();
  if (!marketActivity) return null;

  const dom = parseNum(marketActivity.medianDOM);
  const inventory = parseNum(marketActivity.monthsOfInventory);
  const listToSale = marketActivity.listToSaleRatio;
  const marketType = (marketActivity.marketType || '').toUpperCase();
  const mStyle = MARKET_STYLES[marketType] || MARKET_STYLES.BALANCED;
  const taxRate = marketActivity.propertyTaxRate;
  const annualTax = parseNum(marketActivity.annualPropertyTax);
  const hoa = marketActivity.hoaFees;
  const foreclosure = marketActivity.foreclosureRate;
  const priceToRent = parseNum(marketActivity.priceToRentRatio);
  const absorption = marketActivity.absorptionRate;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-3">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-bold text-slate-900">{t('market.title')}</h3>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${mStyle.bg} ${mStyle.text}`}>
          {t(`market.${mStyle.label}`)}
        </span>
      </div>

      {/* Top metrics: DOM + Inventory */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">{t('market.dom')}</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mb-1">{dom != null ? `${dom}` : '--'} <span className="text-xs font-normal text-slate-400">{t('market.days')}</span></div>
          <DOMGauge days={dom} />
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">{t('market.inventory')}</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mb-1">{inventory != null ? inventory.toFixed(1) : '--'} <span className="text-xs font-normal text-slate-400">{t('market.months')}</span></div>
          <InventoryGauge months={inventory} />
        </div>
      </div>

      {/* Middle row: 4 key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricCard
          icon={<Scale className="w-3.5 h-3.5" />}
          label={t('market.listToSale')}
          value={listToSale || '--'}
        />
        <MetricCard
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          label={t('market.absorption')}
          value={absorption || '--'}
        />
        <MetricCard
          icon={<Home className="w-3.5 h-3.5" />}
          label={t('market.priceToRent')}
          value={priceToRent != null ? priceToRent.toFixed(1) : '--'}
          sub={priceToRent != null ? (priceToRent > 20 ? t('market.rentFavored') : t('market.buyFavored')) : null}
        />
        <MetricCard
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label={t('market.foreclosure')}
          value={foreclosure || '--'}
        />
      </div>

      {/* Bottom: holding costs */}
      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">{t('market.holdingCosts')}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] text-slate-400">{t('market.taxRate')}</div>
            <div className="text-sm font-bold text-slate-700">{taxRate || '--'}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">{t('market.annualTax')}</div>
            <div className="text-sm font-bold text-slate-700">{annualTax != null ? `$${annualTax.toLocaleString()}` : '--'}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">{t('market.hoa')}</div>
            <div className="text-sm font-bold text-slate-700">{hoa || '--'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">{icon}<span className="text-[10px]">{label}</span></div>
      <div className="text-sm font-bold text-slate-700">{value}</div>
      {sub && <div className="text-[9px] text-slate-400">{sub}</div>}
    </div>
  );
}
