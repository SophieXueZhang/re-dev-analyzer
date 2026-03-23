import { Building2, DollarSign, Percent, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
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

const FEASIBILITY_STYLES = {
  STRONG: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  MARGINAL: { bg: 'bg-amber-100', text: 'text-amber-700' },
  NOT_FEASIBLE: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function DevProForma({ devAnalysis, valuation, zoning }) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  const defaults = useMemo(() => {
    const da = devAnalysis || {};
    const v = valuation || {};
    return {
      landCost: parseNum(v.estimatedValue) || 500000,
      buildableSqFt: parseNum(da.maxBuildableSqFt) || 10000,
      costPerSqFt: parseNum(da.constructionCostSqFt) || 200,
      softCostsPct: parseNum(da.softCostsPct) || 22,
      contingencyPct: 10,
      loanPct: parseNum(da.constructionLoanPct) || 65,
      exitCapRate: parseNum(da.exitCapRate) || 5.5,
      rentPerSqFt: (() => {
        const monthly = parseNum(v.estimatedMonthlyRent);
        const sqft = parseNum(v.estimatedSqFt);
        if (monthly > 0 && sqft > 0) return Math.round(monthly * 12 / sqft * 100) / 100;
        return 25;
      })(),
      expenseRatio: 35,
    };
  }, [devAnalysis, valuation]);

  const [landCost, setLandCost] = useState(defaults.landCost);
  const [buildableSqFt, setBuildableSqFt] = useState(defaults.buildableSqFt);
  const [costPerSqFt, setCostPerSqFt] = useState(defaults.costPerSqFt);
  const [softCostsPct, setSoftCostsPct] = useState(defaults.softCostsPct);
  const [contingencyPct, setContingencyPct] = useState(defaults.contingencyPct);
  const [loanPct, setLoanPct] = useState(defaults.loanPct);
  const [exitCapRate, setExitCapRate] = useState(defaults.exitCapRate);
  const [rentPerSqFt, setRentPerSqFt] = useState(defaults.rentPerSqFt);
  const [expenseRatio, setExpenseRatio] = useState(defaults.expenseRatio);

  const calc = useMemo(() => {
    const hardCosts = buildableSqFt * costPerSqFt;
    const softCosts = hardCosts * (softCostsPct / 100);
    const subtotal = landCost + hardCosts + softCosts;
    const contingency = subtotal * (contingencyPct / 100);
    const totalDevCost = subtotal + contingency;

    const grossRevenue = buildableSqFt * rentPerSqFt; // annual
    const expenses = grossRevenue * (expenseRatio / 100);
    const stabilizedNOI = grossRevenue - expenses;

    const yieldOnCost = totalDevCost > 0 ? (stabilizedNOI / totalDevCost) * 100 : 0;
    const exitCap = exitCapRate / 100;
    const exitValue = exitCap > 0 ? stabilizedNOI / exitCap : 0;
    const developerProfit = exitValue - totalDevCost;
    const profitMargin = totalDevCost > 0 ? (developerProfit / totalDevCost) * 100 : 0;
    const developmentSpread = yieldOnCost - exitCapRate; // in percentage points

    const constructionLoan = totalDevCost * (loanPct / 100);
    const equityRequired = totalDevCost - constructionLoan;

    let feasibility = 'NOT_FEASIBLE';
    if (profitMargin >= 20 && developmentSpread >= 1.0) feasibility = 'STRONG';
    else if (profitMargin >= 10 || developmentSpread >= 0.5) feasibility = 'MARGINAL';

    return {
      hardCosts, softCosts, contingency, totalDevCost,
      grossRevenue, stabilizedNOI,
      yieldOnCost, exitValue, developerProfit, profitMargin, developmentSpread,
      constructionLoan, equityRequired, feasibility,
    };
  }, [landCost, buildableSqFt, costPerSqFt, softCostsPct, contingencyPct, loanPct, exitCapRate, rentPerSqFt, expenseRatio]);

  const handleInput = useCallback((setter) => (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setter(v);
  }, []);

  const fStyle = FEASIBILITY_STYLES[calc.feasibility] || FEASIBILITY_STYLES.NOT_FEASIBLE;
  const spreadColor = calc.developmentSpread >= 1.0 ? 'text-emerald-600' : calc.developmentSpread >= 0 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand-600" />
          <h3 className="text-lg font-bold text-slate-900">{t('dev.title')}</h3>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${fStyle.bg} ${fStyle.text}`}>
          {t(`dev.${calc.feasibility.toLowerCase()}`)}
        </span>
      </div>

      {/* Key inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <InputField label={t('dev.landCost')} value={landCost} onChange={handleInput(setLandCost)} icon="$" />
        <InputField label={t('dev.buildableSqFt')} value={buildableSqFt} onChange={handleInput(setBuildableSqFt)} step={500} />
        <InputField label={t('dev.costSqFt')} value={costPerSqFt} onChange={handleInput(setCostPerSqFt)} icon="$" step={10} />
        <InputField label={t('dev.rentSqFt')} value={rentPerSqFt} onChange={handleInput(setRentPerSqFt)} icon="$" step={1} />
        <InputField label={t('dev.exitCap')} value={exitCapRate} onChange={handleInput(setExitCapRate)} icon="%" step={0.25} min={1} max={15} />
        <InputField label={t('dev.loanPct')} value={loanPct} onChange={handleInput(setLoanPct)} icon="%" step={5} min={0} max={80} />
      </div>

      {/* More details toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3 transition-colors"
      >
        {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t('dev.costBreakdown')}
      </button>

      {showDetails && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InputField label={t('dev.softPct')} value={softCostsPct} onChange={handleInput(setSoftCostsPct)} icon="%" step={1} min={10} max={40} small />
            <InputField label={t('dev.contingencyPct')} value={contingencyPct} onChange={handleInput(setContingencyPct)} icon="%" step={1} min={5} max={20} small />
            <InputField label={t('dev.expenseRatio')} value={expenseRatio} onChange={handleInput(setExpenseRatio)} icon="%" step={1} min={20} max={50} small />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
            <CostLine label={t('dev.land')} value={fmt(landCost)} />
            <CostLine label={t('dev.hardCosts')} value={fmt(calc.hardCosts)} />
            <CostLine label={t('dev.softCosts')} value={fmt(calc.softCosts)} />
            <CostLine label={t('dev.contingency')} value={fmt(calc.contingency)} />
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-600">{t('dev.totalCost')}</span>
            <span className="text-sm font-bold text-slate-900">{fmt(calc.totalDevCost)}</span>
          </div>
        </div>
      )}

      {/* Key developer metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricBox
          label={t('dev.yieldOnCost')}
          value={`${calc.yieldOnCost.toFixed(1)}%`}
          sub={calc.yieldOnCost >= 7 ? t('dev.attractive') : calc.yieldOnCost >= 5.5 ? t('dev.acceptable') : t('dev.thin')}
          colorClass={calc.yieldOnCost >= 7 ? 'text-emerald-600' : calc.yieldOnCost >= 5.5 ? 'text-amber-600' : 'text-red-600'}
        />
        <MetricBox
          label={t('dev.devSpread')}
          value={`${calc.developmentSpread >= 0 ? '+' : ''}${calc.developmentSpread.toFixed(1)}%`}
          sub={t('dev.vsMarketCap')}
          colorClass={spreadColor}
        />
        <MetricBox
          label={t('dev.profitMargin')}
          value={`${calc.profitMargin.toFixed(0)}%`}
          positive={calc.profitMargin >= 15}
        />
        <MetricBox
          label={t('dev.exitValue')}
          value={fmt(calc.exitValue)}
        />
      </div>

      {/* Bottom row: financing + profit */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('dev.equity')}</div>
          <div className="text-sm font-bold text-slate-700">{fmt(calc.equityRequired)}</div>
          <div className="text-[9px] text-slate-400">{(100 - loanPct)}% {t('dev.ofCost')}</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('dev.loan')}</div>
          <div className="text-sm font-bold text-slate-700">{fmt(calc.constructionLoan)}</div>
          <div className="text-[9px] text-slate-400">{loanPct}% LTC</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('dev.profit')}</div>
          <div className={`text-sm font-bold ${calc.developerProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <TrendingUp className="w-3 h-3 inline mr-1" />
            {fmt(calc.developerProfit)}
          </div>
        </div>
      </div>

      {devAnalysis?.constructionTimeline && (
        <p className="mt-3 text-xs text-slate-400 italic">{t('dev.timeline')}: {devAnalysis.constructionTimeline}</p>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, icon, small, ...props }) {
  const isPrefix = icon === '$';
  const isPct = icon === '%';
  const py = small ? 'py-1.5' : 'py-2';
  const textSize = small ? 'text-xs' : 'text-sm';
  return (
    <div>
      <label className={`${small ? 'text-[10px]' : 'text-xs'} text-slate-500 mb-1 block`}>{label}</label>
      <div className="relative">
        {isPrefix && <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />}
        {isPct && <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />}
        <input
          type="number"
          value={value}
          onChange={onChange}
          {...props}
          className={`w-full ${isPrefix ? 'pl-7 pr-2' : isPct ? 'pl-3 pr-7' : 'pl-3 pr-2'} ${py} border border-slate-200 rounded-lg ${textSize} focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent`}
        />
      </div>
    </div>
  );
}

function CostLine({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-slate-600">{value}</span>
    </div>
  );
}

function MetricBox({ label, value, sub, positive, colorClass }) {
  const color = colorClass || (positive === undefined ? 'text-slate-900' : positive ? 'text-emerald-600' : 'text-red-600');
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
