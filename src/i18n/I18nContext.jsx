import { createContext, useContext, useState, useCallback } from 'react';
import en from './translations/en';
import zh from './translations/zh';

const translations = { en, zh };
const I18nContext = createContext();

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : `{${key}}`);
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; }
  });

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    try { localStorage.setItem('lang', lang); } catch {}
  }, []);

  const t = useCallback((key, vars) => {
    const value = getNestedValue(translations[language], key)
      ?? getNestedValue(translations.en, key)
      ?? key;
    if (Array.isArray(value)) return value;
    return interpolate(String(value), vars);
  }, [language]);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage: changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
