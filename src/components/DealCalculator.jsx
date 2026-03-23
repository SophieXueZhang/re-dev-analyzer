import { Calculator, DollarSign, TrendingUp, Percent } from 'lucide-react';
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

export default function DealCalculator({ financialModel, valuation }) {
  const { t } = useI18n();

  const defaults = useMemo(() => {
    const fm = financialModel || {};
    const v = valuation || {};
    return {
      price: parseNum(fm.acquisitionCost) || parseNum(v.estimatedValue) || 500000,
      downPct: 20,
      rate: 7.0,
      rent: parseNum(fm.monthlyNOI) ? parseNum(fm.monthlyNOI) + parseNum(fm.monthlyMortgage) : parseNum(v.estimatedMonthlyRent) || 2500,
    };
  }, [financialModel, valuation]);

  const [price, setPrice] = useState(defaults.price);
  const [downPct, setDownPct] = useState(defaults.downPct);
  const [rate, setRate] = useState(defaults.rate);
  const [rent, setRent] = useState(defaults.rent);

  const calc = useMemo(() => {
    const down = price * (downPct / 100);
    const loan = price - down;
    const monthlyRate = rate / 100 / 12;
    const n = 360; // 30 year
    const mortgage = monthlyRate > 0 ? loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1) : loan / n;
    const expenses = rent * 0.35; // 35% expense ratio
    const noi = rent - expenses;
    const cashFlow = noi - mortgage;
    const annualCashFlow = cashFlow * 12;
    const annualNOI = noi * 12;
    const capRate = price > 0 ? (annualNOI / price) * 100 : 0;
    const cashOnCash = down > 0 ? (annualCashFlow / down) * 100 : 0;
    const breakEven = rent > 0 ? ((expenses + mortgage) / rent) * 100 : 0;

    // 5-year equity: appreciation (3%/yr) + principal paydown
    const appreciation = price * (Math.pow(1.03, 5) - 1);
    let principalPaid = 0;
    let balance = loan;
    for (let m = 0; m < 60; m++) {
      const interest = balance * monthlyRate;
      const principal = mortgage - interest;
      principalPaid += principal;
      balance -= principal;
    }
    const fiveYearEquity = appreciation + principalPaid;

    return { down, mortgage, noi, cashFlow, annualCashFlow, capRate, cashOnCash, breakEven, fiveYearEquity };
  }, [price, downPct, rate, rent]);

  const handleInput = useCallback((setter) => (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setter(v);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-3">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">{t('deal.title')}</h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('deal.price')}</label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="number"
              value={price}
              onChange={handleInput(setPrice)}
              className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('deal.downPct')}</label>
          <div className="relative">
            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="number"
              value={downPct}
              onChange={handleInput(setDownPct)}
              min={0} max={100} step={5}
              className="w-full pl-3 pr-7 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('deal.rate')}</label>
          <div className="relative">
            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="number"
              value={rate}
              onChange={handleInput(setRate)}
              min={0} max={20} step={0.25}
              className="w-full pl-3 pr-7 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('deal.rent')}</label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="number"
              value={rent}
              onChange={handleInput(setRent)}
              className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricBox label={t('deal.mortgage')} value={fmt(calc.mortgage)} sub={t('deal.perMonth')} />
        <MetricBox label={t('deal.cashFlow')} value={fmt(calc.cashFlow)} sub={t('deal.perMonth')} positive={calc.cashFlow >= 0} />
        <MetricBox label={t('deal.capRate')} value={`${calc.capRate.toFixed(1)}%`} />
        <MetricBox label={t('deal.cashOnCash')} value={`${calc.cashOnCash.toFixed(1)}%`} positive={calc.cashOnCash >= 0} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('deal.annualCashFlow')}</div>
          <div className={`text-sm font-bold ${calc.annualCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmt(calc.annualCashFlow)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('deal.breakEven')}</div>
          <div className="text-sm font-bold text-slate-700">{calc.breakEven.toFixed(0)}%</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('deal.fiveYearEquity')}</div>
          <div className="text-sm font-bold text-emerald-600">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            {fmt(calc.fiveYearEquity)}
          </div>
        </div>
      </div>

      {/* Assumptions */}
      {financialModel?.assumptions && (
        <p className="mt-3 text-xs text-slate-400 italic">{financialModel.assumptions}</p>
      )}
    </div>
  );
}

function MetricBox({ label, value, sub, positive }) {
  const color = positive === undefined ? 'text-slate-900' : positive ? 'text-emerald-600' : 'text-red-600';
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
