import { Calculator, DollarSign, TrendingUp, Percent, ChevronDown, ChevronUp } from 'lucide-react';
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

export default function DealCalculator({ financialModel, valuation, marketActivity }) {
  const { t } = useI18n();
  const [showExpenses, setShowExpenses] = useState(false);

  const defaults = useMemo(() => {
    const fm = financialModel || {};
    const v = valuation || {};
    const eb = fm.expenseBreakdown || {};
    const ma = marketActivity || {};
    return {
      price: parseNum(fm.acquisitionCost) || parseNum(v.estimatedValue) || 500000,
      downPct: 20,
      rate: 7.0,
      rent: parseNum(fm.monthlyNOI) ? parseNum(fm.monthlyNOI) + parseNum(fm.monthlyMortgage) : parseNum(v.estimatedMonthlyRent) || 2500,
      vacancyPct: 5,
      maintenancePct: 8,
      managementPct: 10,
      insuranceMonthly: parseNum(eb.insurance) || Math.round(parseNum(ma.insuranceEstimate) / 12) || 150,
      taxMonthly: parseNum(eb.propertyTax) || Math.round(parseNum(ma.annualPropertyTax) / 12) || 400,
    };
  }, [financialModel, valuation, marketActivity]);

  const [price, setPrice] = useState(defaults.price);
  const [downPct, setDownPct] = useState(defaults.downPct);
  const [rate, setRate] = useState(defaults.rate);
  const [rent, setRent] = useState(defaults.rent);
  const [vacancyPct, setVacancyPct] = useState(defaults.vacancyPct);
  const [maintenancePct, setMaintenancePct] = useState(defaults.maintenancePct);
  const [managementPct, setManagementPct] = useState(defaults.managementPct);
  const [insuranceMonthly, setInsuranceMonthly] = useState(defaults.insuranceMonthly);
  const [taxMonthly, setTaxMonthly] = useState(defaults.taxMonthly);

  const calc = useMemo(() => {
    const down = price * (downPct / 100);
    const loan = price - down;
    const monthlyRate = rate / 100 / 12;
    const n = 360;
    const mortgage = monthlyRate > 0 ? loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1) : loan / n;

    // Itemized expenses
    const vacancy = rent * (vacancyPct / 100);
    const maintenance = rent * (maintenancePct / 100);
    const management = rent * (managementPct / 100);
    const totalExpenses = vacancy + maintenance + management + insuranceMonthly + taxMonthly;

    const noi = rent - totalExpenses;
    const cashFlow = noi - mortgage;
    const annualCashFlow = cashFlow * 12;
    const annualNOI = noi * 12;
    const annualDebt = mortgage * 12;
    const capRate = price > 0 ? (annualNOI / price) * 100 : 0;
    const cashOnCash = down > 0 ? (annualCashFlow / down) * 100 : 0;
    const breakEven = rent > 0 ? ((totalExpenses + mortgage) / rent) * 100 : 0;

    // DSCR = Annual NOI / Annual Debt Service
    const dscr = annualDebt > 0 ? annualNOI / annualDebt : 0;

    // LTV
    const ltv = price > 0 ? (loan / price) * 100 : 0;

    // 5-year equity: appreciation (3%/yr) + principal paydown
    const appRate = 0.03;
    const appreciation = price * (Math.pow(1 + appRate, 5) - 1);
    let principalPaid = 0;
    let balance = loan;
    for (let m = 0; m < 60; m++) {
      const interest = balance * monthlyRate;
      const principal = mortgage - interest;
      principalPaid += principal;
      balance -= principal;
    }
    const fiveYearEquity = appreciation + principalPaid;

    // IRR (5-year) using Newton's method
    // Cash flows: year 0 = -down, years 1-4 = annualCashFlow, year 5 = annualCashFlow + (price * 1.03^5 - balance after 5yr) - selling costs (6%)
    const exitPrice = price * Math.pow(1 + appRate, 5);
    const sellingCosts = exitPrice * 0.06;
    const exitProceeds = exitPrice - balance - sellingCosts;
    const cfs = [-down];
    for (let yr = 1; yr <= 4; yr++) cfs.push(annualCashFlow);
    cfs.push(annualCashFlow + exitProceeds);

    let irr = 0.10; // initial guess
    for (let iter = 0; iter < 50; iter++) {
      let npv = 0, dnpv = 0;
      for (let i = 0; i < cfs.length; i++) {
        npv += cfs[i] / Math.pow(1 + irr, i);
        dnpv += -i * cfs[i] / Math.pow(1 + irr, i + 1);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const newIrr = irr - npv / dnpv;
      if (Math.abs(newIrr - irr) < 1e-6) { irr = newIrr; break; }
      irr = newIrr;
    }
    if (!isFinite(irr) || irr < -1 || irr > 10) irr = null;

    // Equity Multiple = Total return / initial equity
    const totalCashFlows = annualCashFlow * 5 + exitProceeds;
    const equityMultiple = down > 0 ? totalCashFlows / down : 0;

    return {
      down, loan, mortgage, noi, cashFlow, annualCashFlow, annualNOI, annualDebt,
      capRate, cashOnCash, breakEven, fiveYearEquity,
      dscr, ltv, irr, equityMultiple,
      expenses: { vacancy, maintenance, management, insurance: insuranceMonthly, tax: taxMonthly, total: totalExpenses },
    };
  }, [price, downPct, rate, rent, vacancyPct, maintenancePct, managementPct, insuranceMonthly, taxMonthly]);

  const handleInput = useCallback((setter) => (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setter(v);
  }, []);

  const dscrColor = calc.dscr >= 1.25 ? 'text-emerald-600' : calc.dscr >= 1.0 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-3">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">{t('deal.title')}</h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <InputField label={t('deal.price')} value={price} onChange={handleInput(setPrice)} icon="$" />
        <InputField label={t('deal.downPct')} value={downPct} onChange={handleInput(setDownPct)} icon="%" min={0} max={100} step={5} />
        <InputField label={t('deal.rate')} value={rate} onChange={handleInput(setRate)} icon="%" min={0} max={20} step={0.25} />
        <InputField label={t('deal.rent')} value={rent} onChange={handleInput(setRent)} icon="$" />
      </div>

      {/* Expense Breakdown Toggle */}
      <button
        onClick={() => setShowExpenses(!showExpenses)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3 transition-colors"
      >
        {showExpenses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t('deal.expenseDetail')}
      </button>

      {showExpenses && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block">{t('deal.vacancy')} %</label>
              <input type="number" value={vacancyPct} onChange={handleInput(setVacancyPct)} min={0} max={30} step={1}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">{t('deal.maintenance')} %</label>
              <input type="number" value={maintenancePct} onChange={handleInput(setMaintenancePct)} min={0} max={30} step={1}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">{t('deal.mgmtFee')} %</label>
              <input type="number" value={managementPct} onChange={handleInput(setManagementPct)} min={0} max={30} step={1}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">{t('deal.insuranceMo')}</label>
              <input type="number" value={insuranceMonthly} onChange={handleInput(setInsuranceMonthly)} min={0} step={10}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">{t('deal.taxMo')}</label>
              <input type="number" value={taxMonthly} onChange={handleInput(setTaxMonthly)} min={0} step={10}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500">{t('deal.totalExpenses')}</span>
            <span className="text-sm font-bold text-slate-700">{fmt(calc.expenses.total)}{t('deal.perMonth')}</span>
          </div>
        </div>
      )}

      {/* Primary Outputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricBox label={t('deal.mortgage')} value={fmt(calc.mortgage)} sub={t('deal.perMonth')} />
        <MetricBox label={t('deal.cashFlow')} value={fmt(calc.cashFlow)} sub={t('deal.perMonth')} positive={calc.cashFlow >= 0} />
        <MetricBox label={t('deal.capRate')} value={`${calc.capRate.toFixed(1)}%`} />
        <MetricBox label={t('deal.cashOnCash')} value={`${calc.cashOnCash.toFixed(1)}%`} positive={calc.cashOnCash >= 0} />
      </div>

      {/* Advanced Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricBox
          label={t('deal.dscr')}
          value={calc.dscr.toFixed(2)}
          sub={calc.dscr >= 1.25 ? t('deal.dscrGood') : calc.dscr >= 1.0 ? t('deal.dscrOk') : t('deal.dscrLow')}
          colorClass={dscrColor}
        />
        <MetricBox
          label={t('deal.irr')}
          value={calc.irr != null ? `${(calc.irr * 100).toFixed(1)}%` : '--'}
          sub={t('deal.fiveYear')}
        />
        <MetricBox
          label={t('deal.equityMultiple')}
          value={calc.equityMultiple > 0 ? `${calc.equityMultiple.toFixed(2)}x` : '--'}
          sub={t('deal.fiveYear')}
        />
        <MetricBox
          label={t('deal.ltv')}
          value={`${calc.ltv.toFixed(0)}%`}
        />
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

function InputField({ label, value, onChange, icon, ...props }) {
  const isPrefix = icon === '$';
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <div className="relative">
        {isPrefix ? (
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        ) : (
          <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        )}
        <input
          type="number"
          value={value}
          onChange={onChange}
          {...props}
          className={`w-full ${isPrefix ? 'pl-7 pr-2' : 'pl-3 pr-7'} py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent`}
        />
      </div>
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
