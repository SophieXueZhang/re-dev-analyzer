import { useState } from 'react';
import Header from './components/Header';
import AddressInput from './components/AddressInput';
import ScoreCard from './components/ScoreCard';
import InvestmentThesis from './components/InvestmentThesis';
import DealCalculator from './components/DealCalculator';
import ValuationPanel from './components/ValuationPanel';
import NeighborhoodProfile from './components/NeighborhoodProfile';
import RiskPanel from './components/RiskPanel';
import MarketPulse from './components/MarketPulse';
import ZoningPanel from './components/ZoningPanel';
import LoadingState from './components/LoadingState';
import { analyzeProperty } from './services/api';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useI18n } from './i18n/I18nContext';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { t, language } = useI18n();

  const handleAnalyze = async (address) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await analyzeProperty(address, language);
      setData(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err.message || t('errors.defaultMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <AddressInput onAnalyze={handleAnalyze} loading={loading} />

        {loading && <LoadingState />}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-800">{t('errors.analysisFailed')}</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('errors.tryAgain')}
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <ScoreCard data={data} />

            <InvestmentThesis thesis={data.investmentThesis} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <DealCalculator financialModel={data.financialModel} valuation={data.valuation} marketActivity={data.marketActivity} />
              <MarketPulse marketActivity={data.marketActivity} valuation={data.valuation} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ValuationPanel valuation={data.valuation} />
              <NeighborhoodProfile profile={data.neighborhoodProfile} />
            </div>

            <RiskPanel risks={data.risks} />

            <ZoningPanel zoning={data.zoning} />

            <div className="text-center py-4">
              <p className="text-xs text-slate-400 max-w-2xl mx-auto">
                {t('disclaimer')}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
