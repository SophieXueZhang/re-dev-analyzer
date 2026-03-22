import { Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

export default function LoadingState() {
  const [step, setStep] = useState(0);
  const { t } = useI18n();
  const steps = t('loading.steps');

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % steps.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative mb-6">
        <div className="spinner"></div>
        <Building2 className="absolute inset-0 m-auto w-5 h-5 text-brand-600" />
      </div>
      <p className="text-slate-700 font-medium text-base mb-1">{t('loading.title')}</p>
      <p className="text-slate-400 text-sm transition-all duration-300" key={step}>
        {steps[step]}
      </p>
    </div>
  );
}
