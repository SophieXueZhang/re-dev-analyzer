import { useI18n } from '../i18n/I18nContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 transition-colors ${
          language === 'en'
            ? 'bg-brand-600 text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('zh')}
        className={`px-2.5 py-1 transition-colors ${
          language === 'zh'
            ? 'bg-brand-600 text-white'
            : 'bg-white text-slate-500 hover:bg-slate-50'
        }`}
      >
        中文
      </button>
    </div>
  );
}
