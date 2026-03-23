import { Search, MapPin, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';

const EXAMPLE_ADDRESSES = [
  '1600 Pennsylvania Ave NW, Washington, DC 20500',
  '350 5th Ave, New York, NY 10118',
  '233 S Wacker Dr, Chicago, IL 60606',
  '1 Infinite Loop, Cupertino, CA 95014',
];

export default function AddressInput({ onAnalyze, loading }) {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [fetching, setFetching] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const { t } = useI18n();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setFetching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: query, format: 'json', countrycodes: 'us', limit: '6', addressdetails: '1',
      })}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'REDevAnalyzer/1.0' },
        signal: abortRef.current.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      const items = data.filter(d => d.display_name).map(d => {
        const a = d.address || {};
        const parts = [];
        if (a.house_number && a.road) parts.push(`${a.house_number} ${a.road}`);
        else if (a.road) parts.push(a.road);
        else if (d.name) parts.push(d.name);
        const city = a.city || a.town || a.village || a.hamlet || '';
        if (city) parts.push(city);
        if (a.state) parts.push(a.state);
        if (a.postcode) parts.push(a.postcode);
        return {
          display: parts.length >= 2 ? parts.join(', ') : d.display_name.split(', ').slice(0, 4).join(', '),
        };
      });
      setSuggestions(items);
      setShowSuggestions(items.length > 0);
      setActiveIdx(-1);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Autocomplete error:', e.message);
    } finally {
      setFetching(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setAddress(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const selectSuggestion = (item) => {
    setAddress(item.display);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (address.trim() && !loading) {
      setShowSuggestions(false);
      onAnalyze(address.trim());
    }
  };

  const handleExample = (addr) => {
    setAddress(addr);
    setShowSuggestions(false);
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
        <div className="relative" ref={wrapperRef}>
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={t('input.placeholder')}
            className="w-full pl-12 pr-32 py-4 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400"
            disabled={loading}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
          />
          {fetching && (
            <Loader2 className="absolute right-36 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
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

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
              role="listbox"
            >
              {suggestions.map((item, idx) => (
                <li
                  key={idx}
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    idx === activeIdx
                      ? 'bg-brand-50 text-brand-700'
                      : 'hover:bg-slate-50 text-slate-700'
                  } ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                  onClick={() => selectSuggestion(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <MapPin className={`w-4 h-4 flex-shrink-0 ${idx === activeIdx ? 'text-brand-500' : 'text-slate-400'}`} />
                  <span className="text-sm font-medium truncate">{item.display}</span>
                </li>
              ))}
            </ul>
          )}
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
