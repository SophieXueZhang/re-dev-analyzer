import { Landmark, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
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

function pct(n, decimals = 1) {
  if (n == null || !isFinite(n)) return '--';
  return `${n.toFixed(decimals)}%`;
}

// Newton's method IRR calculator
function calcIRR(cashFlows) {
  let irr = 0.10;
  for (let iter = 0; iter < 50; iter++) {
    let npv = 0, dnpv = 0;
    for (let i = 0; i < cashFlows.length; i++) {
      npv += cashFlows[i] / Math.pow(1 + irr, i);
      dnpv += -i * cashFlows[i] / Math.pow(1 + irr, i + 1);
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const next = irr - npv / dnpv;
    if (Math.abs(next - irr) < 1e-6) { irr = next; break; }
    irr = next;
  }
  if (!isFinite(irr) || irr < -1 || irr > 10) return null;
  return irr;
}

// Build multi-year cash flows for a given hold period
function buildCashFlows({ price, down, loan, monthlyRate, mortgage, annualNOI, appRate, sellingCostPct, holdYears }) {
  // Levered
  const leveredCFs = [-down];
  let balance = loan;
  for (let yr = 1; yr <= holdYears; yr++) {
    const annualDebt = mortgage * 12;
    const cf = annualNOI - annualDebt;
    // paydown balance for year
    for (let m = 0; m < 12; m++) {
      const int = balance * monthlyRate;
      balance -= (mortgage - int);
    }
    if (yr < holdYears) {
      leveredCFs.push(cf);
    } else {
      const exitPrice = price * Math.pow(1 + appRate, yr);
      const sellCosts = exitPrice * sellingCostPct;
      const exitProceeds = exitPrice - balance - sellCosts;
      leveredCFs.push(cf + exitProceeds);
    }
  }

  // Unlevered
  const unleveredCFs = [-price];
  for (let yr = 1; yr <= holdYears; yr++) {
    if (yr < holdYears) {
      unleveredCFs.push(annualNOI);
    } else {
      const exitPrice = price * Math.pow(1 + appRate, yr);
      const sellCosts = exitPrice * sellingCostPct;
      unleveredCFs.push(annualNOI + exitPrice - sellCosts);
    }
  }

  return { leveredCFs, unleveredCFs };
}

// GP/LP waterfall calculation
function calcWaterfall({ totalProfit, equity, holdYears, prefRate, promoteAbovePref }) {
  // Simple waterfall: LP gets pref first, then promote split
  const prefReturn = equity * prefRate * holdYears;
  const lpPrefTotal = Math.min(totalProfit, prefReturn);

  const profitAbovePref = Math.max(0, totalProfit - prefReturn);
  const gpPromote = profitAbovePref * promoteAbovePref;
  const lpAbovePref = profitAbovePref - gpPromote;

  const lpTotal = lpPrefTotal + lpAbovePref;
  const gpTotal = gpPromote;

  const lpIrr = equity > 0 ? ((lpTotal / holdYears) / equity) * 100 : 0;
  const gpIrr = gpTotal > 0 ? Infinity : 0; // GP puts in no capital typically

  return { lpTotal, gpTotal, lpPrefTotal, gpPromote, lpIrr, prefReturn };
}

export default function FundAnalysis({ financialModel, valuation, marketActivity }) {
  const { t } = useI18n();
  const [showWaterfall, setShowWaterfall] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);

  // Waterfall inputs
  const [prefRate, setPrefRate] = useState(8);
  const [promotePct, setPromotePct] = useState(20);

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
      totalExpensesPct: 28, // vacancy + maintenance + management + insurance + tax as % of gross rent
      appRate: parseNum(v.annualAppreciation) || 3.0,
      exitCapBps: parseNum(ma.exitCapRate) || parseNum(v.capRate) || 5.5,
    };
  }, [financialModel, valuation, marketActivity]);

  const price = defaults.price;
  const downPct = defaults.downPct;
  const rate = defaults.rate;
  const rent = defaults.rent;
  const totalExpensesPct = defaults.totalExpensesPct;
  const appRate = defaults.appRate / 100;
  const sellingCostPct = 0.06;

  const calc = useMemo(() => {
    const down = price * (downPct / 100);
    const loan = price - down;
    const monthlyRate = rate / 100 / 12;
    const n = 360;
    const mortgage = monthlyRate > 0 ? loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1) : loan / n;
    const grossRent = rent * 12;
    const expenses = grossRent * (totalExpensesPct / 100);
    const annualNOI = grossRent - expenses;

    // Debt Yield = NOI / Loan
    const debtYield = loan > 0 ? (annualNOI / loan) * 100 : 0;

    // Going-in Cap Rate
    const goingInCap = price > 0 ? (annualNOI / price) * 100 : 0;

    // Hold period comparison: 3, 5, 7, 10 years
    const holdPeriods = [3, 5, 7, 10];
    const periodResults = holdPeriods.map(yrs => {
      const { leveredCFs, unleveredCFs } = buildCashFlows({
        price, down, loan, monthlyRate, mortgage, annualNOI, appRate, sellingCostPct, holdYears: yrs,
      });
      const levIRR = calcIRR(leveredCFs);
      const unlevIRR = calcIRR(unleveredCFs);

      // Equity multiple (levered)
      const totalReturn = leveredCFs.slice(1).reduce((s, v) => s + v, 0);
      const eqMult = down > 0 ? totalReturn / down : 0;

      return { years: yrs, levIRR, unlevIRR, eqMult };
    });

    // Sensitivity matrix: rows = exit cap rates, cols = rent growth rates
    const exitCaps = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];
    const rentGrowths = [0, 1, 2, 3, 4, 5];
    const holdYears = 5;

    const sensitivityMatrix = exitCaps.map(exitCap => {
      return rentGrowths.map(rg => {
        // Adjust NOI for rent growth over hold period
        // Simple: use average NOI growth
        const avgNOI = annualNOI * ((1 + rg / 100) ** holdYears + 1) / 2; // rough midpoint
        const exitNOI = annualNOI * Math.pow(1 + rg / 100, holdYears);
        const exitValue = exitNOI / (exitCap / 100);

        const cfs = [-down];
        let bal = loan;
        for (let yr = 1; yr <= holdYears; yr++) {
          const yrNOI = annualNOI * Math.pow(1 + rg / 100, yr);
          const debt = mortgage * 12;
          const cf = yrNOI - debt;
          for (let m = 0; m < 12; m++) {
            const int = bal * monthlyRate;
            bal -= (mortgage - int);
          }
          if (yr < holdYears) {
            cfs.push(cf);
          } else {
            const sellCosts = exitValue * sellingCostPct;
            cfs.push(cf + exitValue - bal - sellCosts);
          }
        }
        return calcIRR(cfs);
      });
    });

    // GP/LP waterfall for 5-year hold
    const fiveYearCFs = buildCashFlows({
      price, down, loan, monthlyRate, mortgage, annualNOI, appRate, sellingCostPct, holdYears: 5,
    });
    const totalReturn5yr = fiveYearCFs.leveredCFs.slice(1).reduce((s, v) => s + v, 0);
    const totalProfit = totalReturn5yr - down;

    return {
      debtYield, goingInCap, annualNOI, down, loan,
      periodResults, sensitivityMatrix, exitCaps, rentGrowths,
      totalProfit, fiveYearLevIRR: periodResults.find(p => p.years === 5)?.levIRR,
      fiveYearUnlevIRR: periodResults.find(p => p.years === 5)?.unlevIRR,
    };
  }, [price, downPct, rate, rent, totalExpensesPct, appRate]);

  const waterfall = useMemo(() => {
    return calcWaterfall({
      totalProfit: calc.totalProfit,
      equity: calc.down,
      holdYears: 5,
      prefRate: prefRate / 100,
      promoteAbovePref: promotePct / 100,
    });
  }, [calc.totalProfit, calc.down, prefRate, promotePct]);

  const handleInput = useCallback((setter) => (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setter(v);
  }, []);

  const debtYieldColor = calc.debtYield >= 10 ? 'text-emerald-600' : calc.debtYield >= 8 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-slide-up stagger-5">
      <div className="flex items-center gap-2 mb-5">
        <Landmark className="w-5 h-5 text-brand-600" />
        <h3 className="text-lg font-bold text-slate-900">{t('fund.title')}</h3>
      </div>

      {/* Top Metrics: Levered IRR, Unlevered IRR, Debt Yield, Going-in Cap */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MetricBox
          label={t('fund.leveredIRR')}
          value={calc.fiveYearLevIRR != null ? pct(calc.fiveYearLevIRR * 100) : '--'}
          sub={t('fund.fiveYear')}
          colorClass={calc.fiveYearLevIRR != null && calc.fiveYearLevIRR >= 0.15 ? 'text-emerald-600' : calc.fiveYearLevIRR >= 0.08 ? 'text-amber-600' : 'text-red-600'}
        />
        <MetricBox
          label={t('fund.unleveredIRR')}
          value={calc.fiveYearUnlevIRR != null ? pct(calc.fiveYearUnlevIRR * 100) : '--'}
          sub={t('fund.fiveYear')}
          colorClass={calc.fiveYearUnlevIRR != null && calc.fiveYearUnlevIRR >= 0.08 ? 'text-emerald-600' : calc.fiveYearUnlevIRR >= 0.05 ? 'text-amber-600' : 'text-red-600'}
        />
        <MetricBox
          label={t('fund.debtYield')}
          value={pct(calc.debtYield)}
          sub={calc.debtYield >= 10 ? t('fund.strong') : calc.debtYield >= 8 ? t('fund.adequate') : t('fund.weak')}
          colorClass={debtYieldColor}
        />
        <MetricBox
          label={t('fund.goingInCap')}
          value={pct(calc.goingInCap)}
        />
      </div>

      {/* Hold Period Comparison */}
      <div className="mb-4">
        <div className="text-xs font-semibold text-slate-600 mb-2">{t('fund.holdComparison')}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="text-left py-1.5 pr-2 font-medium">{t('fund.holdPeriod')}</th>
                <th className="text-right py-1.5 px-2 font-medium">{t('fund.leveredIRR')}</th>
                <th className="text-right py-1.5 px-2 font-medium">{t('fund.unleveredIRR')}</th>
                <th className="text-right py-1.5 px-2 font-medium">{t('fund.eqMultiple')}</th>
                <th className="text-right py-1.5 pl-2 font-medium">{t('fund.leverageSpread')}</th>
              </tr>
            </thead>
            <tbody>
              {calc.periodResults.map(p => {
                const spread = p.levIRR != null && p.unlevIRR != null ? (p.levIRR - p.unlevIRR) * 100 : null;
                return (
                  <tr key={p.years} className="border-b border-slate-100">
                    <td className="py-1.5 pr-2 font-medium text-slate-700">{p.years} {t('fund.years')}</td>
                    <td className={`text-right py-1.5 px-2 font-bold ${p.levIRR != null && p.levIRR >= 0.15 ? 'text-emerald-600' : p.levIRR >= 0.08 ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.levIRR != null ? pct(p.levIRR * 100) : '--'}
                    </td>
                    <td className={`text-right py-1.5 px-2 font-bold ${p.unlevIRR != null && p.unlevIRR >= 0.08 ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {p.unlevIRR != null ? pct(p.unlevIRR * 100) : '--'}
                    </td>
                    <td className="text-right py-1.5 px-2 font-bold text-slate-700">
                      {p.eqMult > 0 ? `${p.eqMult.toFixed(2)}x` : '--'}
                    </td>
                    <td className={`text-right py-1.5 pl-2 font-medium ${spread != null && spread > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {spread != null ? `${spread >= 0 ? '+' : ''}${spread.toFixed(1)}%` : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GP/LP Waterfall Toggle */}
      <button
        onClick={() => setShowWaterfall(!showWaterfall)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3 transition-colors"
      >
        {showWaterfall ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t('fund.waterfallTitle')}
      </button>

      {showWaterfall && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-slate-400 block">{t('fund.prefReturn')} %</label>
              <input type="number" value={prefRate} onChange={handleInput(setPrefRate)} min={0} max={20} step={0.5}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block">{t('fund.promote')} %</label>
              <input type="number" value={promotePct} onChange={handleInput(setPromotePct)} min={0} max={50} step={5}
                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>

          {/* Waterfall visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{t('fund.totalProfit')} (5yr)</span>
              <span className={`text-sm font-bold ${calc.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(calc.totalProfit)}</span>
            </div>

            {/* Stacked bar */}
            {calc.totalProfit > 0 && (
              <div className="h-6 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-400 flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ width: `${Math.max(5, (waterfall.lpTotal / (waterfall.lpTotal + waterfall.gpTotal)) * 100)}%` }}
                >
                  LP
                </div>
                {waterfall.gpTotal > 0 && (
                  <div
                    className="bg-amber-400 flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ width: `${Math.max(5, (waterfall.gpTotal / (waterfall.lpTotal + waterfall.gpTotal)) * 100)}%` }}
                  >
                    GP
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="text-center">
                <div className="text-[10px] text-blue-600 font-medium">{t('fund.lpReturn')}</div>
                <div className="text-sm font-bold text-blue-700">{fmt(waterfall.lpTotal)}</div>
                <div className="text-[9px] text-slate-400">{t('fund.inclPref')}: {fmt(waterfall.lpPrefTotal)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-amber-600 font-medium">{t('fund.gpPromote')}</div>
                <div className="text-sm font-bold text-amber-700">{fmt(waterfall.gpTotal)}</div>
                <div className="text-[9px] text-slate-400">{promotePct}% {t('fund.abovePref')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sensitivity Matrix Toggle */}
      <button
        onClick={() => setShowSensitivity(!showSensitivity)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-3 transition-colors"
      >
        {showSensitivity ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t('fund.sensitivityTitle')}
      </button>

      {showSensitivity && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4 overflow-x-auto">
          <div className="text-[10px] text-slate-500 mb-2">
            {t('fund.sensitivityDesc')}
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left py-1 pr-1 text-slate-500 font-medium">
                  {t('fund.exitCap')} \ {t('fund.rentGrowth')}
                </th>
                {calc.rentGrowths.map(rg => (
                  <th key={rg} className="text-center py-1 px-1 text-slate-500 font-medium">{rg}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calc.exitCaps.map((ec, ri) => (
                <tr key={ec} className="border-t border-slate-200">
                  <td className="py-1 pr-1 font-medium text-slate-600">{ec.toFixed(1)}%</td>
                  {calc.sensitivityMatrix[ri].map((irr, ci) => {
                    const color = irr == null ? 'text-slate-400 bg-slate-100'
                      : irr >= 0.20 ? 'text-emerald-800 bg-emerald-100 font-bold'
                      : irr >= 0.15 ? 'text-emerald-700 bg-emerald-50 font-bold'
                      : irr >= 0.10 ? 'text-amber-700 bg-amber-50 font-medium'
                      : irr >= 0.05 ? 'text-orange-700 bg-orange-50'
                      : 'text-red-700 bg-red-50';
                    return (
                      <td key={ci} className={`text-center py-1 px-1 rounded ${color}`}>
                        {irr != null ? pct(irr * 100) : '--'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom: NOI, Debt Yield context */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('fund.annualNOI')}</div>
          <div className="text-sm font-bold text-slate-700">{fmt(calc.annualNOI)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('fund.loanAmount')}</div>
          <div className="text-sm font-bold text-slate-700">{fmt(calc.loan)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-slate-500">{t('fund.equityRequired')}</div>
          <div className="text-sm font-bold text-slate-700">{fmt(calc.down)}</div>
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, sub, colorClass }) {
  const color = colorClass || 'text-slate-900';
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}
