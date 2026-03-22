import { Search, MapPin, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

const EXAMPLE_ADDRESSES = [
  '1600 Pennsylvania Ave NW, Washington, DC 20500',
  '350 5th Ave, New York, NY 10118',
  '233 S Wacker Dr, Chicago, IL 60606',
  '1 Infinite Loop, Cupertino, CA 95014',
];

export default function AddressInput({ onAnalyze, loading }) {
  const [address, setAddress] = useState('');
  const { t } = useI18n();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (address.trim() && !loading) {
      onAnalyze(address.trim());
    }
  };

  const handleExample = (addr) => {
    setAddress(addr);
    onAnalyze(addr);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          {t('input.title')}
        </h2>
        <p className="text-slate-500 text-sm sm:text-base">
          {t('input.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('input.placeholder')}
            className="w-full pl-12 pr-32 py-4 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!address.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('input.analyzing')}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {t('input.analyze')}
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-5 text-center">
        <p className="text-xs text-slate-400 mb-2">{t('input.tryExample')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_ADDRESSES.map((addr) => (
            <button
              key={addr}
              onClick={() => handleExample(addr)}
              disabled={loading}
              className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-brand-50 hover:text-brand-600 transition-all disabled:opacity-50"
            >
              {addr.split(',')[0]}...
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
