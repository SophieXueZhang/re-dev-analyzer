import { Home, DollarSign, Percent, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
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

// Monthly mortgage calculation
function calcMortgage(principal, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r <= 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Loan programs
const LOAN_PROGRAMS = [
  { key: 'fha', downPct: 3.5, pmi: 0.85, label: 'FHA 3.5%' },
  { key: 'conv5', downPct: 5, pmi: 0.7, label: 'Conv 5%' },
  { key: 'conv10', downPct: 10, pmi: 0.45, label: 'Conv 10%' },
  { key: 'conv20', downPct: 20, pmi: 0, label: 'Conv 20%' },
];

export default function HomeBuyerGuide({ financialModel, valuation, marketActivity }) {
  const { t } = useI18n();
  const [showRentVsBuy, setShowRentVsBuy] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState('conv5');

  const defaults = useMemo(() => {
    const fm = financialModel || {};
    const v = valuation || {};
    const ma = marketActivity || {};
    return {
      price: parseNum(fm.acquisitionCost) || parseNum(v.estimatedValue) || 500000,
      rate: 7.0,
      rent: parseNum(v.estimatedMonthlyRent) || 2500,
      taxMonthly: Math.round(parseNum(ma.annualPropertyTax) / 12) || 400,
      insuranceMonthly: Math.round(parseNum(ma.insuranceEstimate) / 12) || 150,
      hoaMonthly: parseNum(ma.hoaFees) || 0,
      appRate: parseNum(v.annualAppreciation) || 3.0,
    };
  }, [financialModel, valuation, marketActivity]);

  const [price, setPrice] = useState(defaults.price);
  const [rate, setRate] = useState(defaults.rate);
  const [rent, setRent] = useState(defaults.rent);

  const handleInput = useCallback((setter) => (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setter(v);
  }, []);

  // Calculate all loan programs
  const programs = useMemo(() => {
    return LOAN_PROGRAMS.map(prog => {
      const down = price * (prog.downPct / 100);
      const loan = price - down;
      const mortgage = calcMortgage(loan, rate, 30);
      const pmiMonthly = prog.pmi > 0 ? (loan * (prog.pmi / 100)) / 12 : 0;
      const taxMo = defaults.taxMonthly;
      const insMo = defaults.insuranceMonthly;
      const hoaMo = defaults.hoaMonthly;
      const totalPITI = mortgage + taxMo + insMo + hoaMo + pmiMonthly;

      // Required income: PITI should be <= 28% of gross monthly income
      const requiredIncome = totalPITI / 0.28 * 12;

      // Closing costs: ~2-5% of price
      const closingCosts = price * 0.03;
      const totalCashNeeded = down + closingCosts;

      // Months until 20% equity (for PMI removal)
      let monthsTo20 = null;
      if (prog.downPct < 20) {
        const target = price * 0.20; // need 20% of original price in equity
        const monthlyRate = rate / 100 / 12;
        let balance = loan;
        let equity = down;
        const appMonthly = Math.pow(1 + defaults.appRate / 100, 1 / 12) - 1;
        let currentValue = price;
        for (let m = 1; m <= 360; m++) {
          const interest = balance * monthlyRate;
          const principal = mortgage - interest;
          balance -= principal;
          currentValue *= (1 + appMonthly);
          equity = currentValue - balance;
          if (equity >= currentValue * 0.20) {
            monthsTo20 = m;
            break;
          }
        }
      }

      return {
        ...prog,
        down, loan, mortgage, pmiMonthly,
        tax: taxMo, insurance: insMo, hoa: hoaMo,
        totalPITI, requiredIncome, closingCosts, totalCashNeeded,
        monthsTo20,
      };
    });
  }, [price, rate, defaults]);

  const selected = programs.find(p => p.key === selectedProgram) || programs[1];

  // Rent vs Buy analysis (5-year)
  const rentVsBuy = useMemo(() => {
    const years = 5;
    const monthlyRate = rate / 100 / 12;
    const rentGrowth = 0.03; // 3% annual rent growth assumed

    // Rent total
    let totalRent = 0;
    let monthlyRent = rent;
    for (let yr = 0; yr < years; yr++) {
      totalRent += monthlyRent * 12;
      monthlyRent *= (1 + rentGrowth);
    }
    // Renter invests the difference (down payment) at 5% return
    const investmentReturn = selected.totalCashNeeded * (Math.pow(1.05, years) - 1);
    const renterWealth = investmentReturn; // net: they still have to pay rent

    // Buy total
    const totalMortgage = selected.totalPITI * 12 * years;
    let balance = selected.loan;
    for (let m = 0; m < years * 12; m++) {
      const interest = balance * monthlyRate;
      balance -= (selected.mortgage - interest);
    }
    const homeValue = price * Math.pow(1 + defaults.appRate / 100, years);
    const equity = homeValue - balance;
    const sellingCosts = homeValue * 0.06;
    const netProceeds = equity - sellingCosts;

    // Tax benefits (rough: mortgage interest deduction)
    const avgAnnualInterest = selected.loan * (rate / 100) * 0.8; // rough average
    const taxSavings = avgAnnualInterest * 0.22 * years; // 22% marginal rate

    const buyerTotalCost = selected.totalCashNeeded + totalMortgage;
    const buyerNetWealth = netProceeds + taxSavings - buyerTotalCost + selected.totalCashNeeded;
    const renterNetWealth = renterWealth - totalRent;

    const buyIsBetter = buyerNetWealth > renterNetWealth;

    // Break-even: find month where buying becomes cheaper
    let breakEvenMonth = null;
    let cumBuyCost = selected.totalCashNeeded;
    let cumRentCost = 0;
    let bal = selected.loan;
    let mRent = rent;
    for (let m = 1; m <= 120; m++) {
      cumBuyCost += selected.totalPITI;
      cumRentCost += mRent;
      if (m % 12 === 0) mRent *= (1 + rentGrowth);

      const int = bal * monthlyRate;
      bal -= (selected.mortgage - int);
      const hv = price * Math.pow(1 + defaults.appRate / 100, m / 12);
      const eq = hv - bal;

      // Net cost of buying = cumulative payments - equity built
      const netBuyCost = cumBuyCost - eq;
      if (netBuyCost < cumRentCost && !breakEvenMonth) {
        breakEvenMonth = m;
      }
    }

    return {
      totalRent, totalMortgage: buyerTotalCost, homeValue, equity, netProceeds,
      buyerNetWealth, renterNetWealth, buyIsBetter,
      breakEvenMonth, breakEvenYears: breakEvenMonth ? (breakEvenMonth / 12).toFixed(1) : null,
    };
  }, [price, rate, rent, selected, defaults]);

  // PITI breakdown percentages for visual bar
  const pitiParts = [
    { key: 'principal', color: 'bg-brand-500', value: selected.mortgage - (selected.loan * rate / 100 / 12) },
    { key: 'interest', color: 'bg-brand-300', value: selected.loan * rate / 100 / 12 },
    { key: 'tax', color: 'bg-amber-400', value: selected.tax },
    { key: 'insurance', color: 'bg-blue-400', value: selected.insurance },
  ];
  if (selected.pmiMonthly > 0) pitiParts.push({ key: 'pmi', color: 'bg-red-400', value: selected.pmiMonthly });
  if (selected.hoa > 0) pitiParts.push({ key: 'hoa', color: 'bg-purple-400', value: selected.hoa });
  const pitiTotal = pitiParts.reduce((s, p) => s + p.value, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-3">
      <div className="flex items-center gap-2 mb-5">
        <Home className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">{t('buyer.title')}</h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('buyer.price')}</label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="number" value={price} onChange={handleInput(setPrice)}
              className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('buyer.rate')}</label>
          <div className="relative">
            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="number" value={rate} onChange={handleInput(setRate)} min={0} max={20} step={0.25}
              className="w-full pl-3 pr-7 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">{t('buyer.currentRent')}</label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="number" value={rent} onChange={handleInput(setRent)}
              className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
      </div>

      {/* Loan Program Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        {programs.map(p => (
          <button
            key={p.key}
            onClick={() => setSelectedProgram(p.key)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedProgram === p.key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Monthly PITI Breakdown Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-600">{t('buyer.monthlyPayment')}</span>
          <span className="text-lg font-bold text-slate-900">{fmt(selected.totalPITI)}<span className="text-xs font-normal text-slate-400">/mo</span></span>
        </div>
        <div className="h-4 rounded-full overflow-hidden flex">
          {pitiParts.map(p => (
            <div
              key={p.key}
              className={`${p.color} transition-all`}
              style={{ width: `${Math.max(1, (p.value / pitiTotal) * 100)}%` }}
              title={`${t(`buyer.${p.key}`)}: ${fmt(p.value)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {pitiParts.map(p => (
            <div key={p.key} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${p.color}`} />
              <span className="text-[10px] text-slate-500">{t(`buyer.${p.key}`)} {fmt(p.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">{t('buyer.downPayment')}</div>
          <div className="text-sm font-bold text-slate-900">{fmt(selected.down)}</div>
          <div className="text-[10px] text-slate-400">{selected.downPct}%</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">{t('buyer.closingCosts')}</div>
          <div className="text-sm font-bold text-slate-900">{fmt(selected.closingCosts)}</div>
          <div className="text-[10px] text-slate-400">~3%</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">{t('buyer.totalCash')}</div>
          <div className="text-sm font-bold text-brand-700">{fmt(selected.totalCashNeeded)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">{t('buyer.requiredIncome')}</div>
          <div className="text-sm font-bold text-slate-900">{fmt(selected.requiredIncome)}</div>
          <div className="text-[10px] text-slate-400">{t('buyer.perYear')}</div>
        </div>
      </div>

      {/* PMI & Equity Timeline */}
      {selected.pmiMonthly > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-800">{t('buyer.pmiLabel')}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">
                {t('buyer.pmiNote')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-amber-700">{fmt(selected.pmiMonthly)}<span className="text-[10px] font-normal">/mo</span></div>
              {selected.monthsTo20 && (
                <div className="text-[10px] text-amber-600">
                  {t('buyer.pmiDropsIn')} {selected.monthsTo20 < 12 ? `${selected.monthsTo20} mo` : `${(selected.monthsTo20 / 12).toFixed(1)} yr`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rent vs Buy Toggle */}
      <button
        onClick={() => setShowRentVsBuy(!showRentVsBuy)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3 transition-colors"
      >
        {showRentVsBuy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t('buyer.rentVsBuy')}
      </button>

      {showRentVsBuy && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="text-[10px] text-slate-500 mb-3">{t('buyer.fiveYearComparison')}</div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Rent column */}
            <div className={`rounded-lg px-3 py-2.5 border-2 ${!rentVsBuy.buyIsBetter ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="text-xs font-semibold text-slate-600 mb-1">{t('buyer.renting')}</div>
              <div className="text-[10px] text-slate-400">{t('buyer.totalRentPaid')}</div>
              <div className="text-sm font-bold text-slate-700">{fmt(rentVsBuy.totalRent)}</div>
            </div>

            {/* Buy column */}
            <div className={`rounded-lg px-3 py-2.5 border-2 ${rentVsBuy.buyIsBetter ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="text-xs font-semibold text-slate-600 mb-1">{t('buyer.buying')}</div>
              <div className="text-[10px] text-slate-400">{t('buyer.equityBuilt')}</div>
              <div className="text-sm font-bold text-emerald-600">{fmt(rentVsBuy.equity)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            {rentVsBuy.buyIsBetter
              ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
            <span className="text-xs text-slate-600">
              {rentVsBuy.buyIsBetter ? t('buyer.buyBetter') : t('buyer.rentBetter')}
              {rentVsBuy.breakEvenYears && (
                <span className="text-slate-400"> -- {t('buyer.breakEven')}: {rentVsBuy.breakEvenYears} {t('buyer.years')}</span>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200">
            <div>
              <div className="text-[10px] text-slate-400">{t('buyer.homeValueIn5')}</div>
              <div className="text-xs font-bold text-slate-700">{fmt(rentVsBuy.homeValue)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">{t('buyer.netProceeds')}</div>
              <div className="text-xs font-bold text-emerald-600">{fmt(rentVsBuy.netProceeds)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Affordability quick check */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl px-4 py-3">
        <div className="text-xs font-semibold text-slate-600 mb-2">{t('buyer.affordCheck')}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {programs.map(p => {
            const affordable = p.requiredIncome <= (defaults.taxMonthly > 0 ? p.requiredIncome * 1.5 : 200000); // rough check
            return (
              <div key={p.key} className="text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">{p.label}</div>
                <div className="text-xs font-bold text-slate-700">{fmt(p.totalPITI)}<span className="text-[9px] font-normal text-slate-400">/mo</span></div>
                <div className="text-[10px] text-slate-400">{t('buyer.needIncome')} {fmt(p.requiredIncome)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
