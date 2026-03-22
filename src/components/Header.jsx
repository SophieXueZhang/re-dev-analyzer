import { Building2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const { t } = useI18n();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('header.title')}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('header.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium text-xs">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              {t('header.aiPowered')}
            </span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
