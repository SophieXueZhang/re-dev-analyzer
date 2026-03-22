import { Building2 } from 'lucide-react';

const STEPS = [
  'Geocoding address...',
  'Analyzing market data...',
  'Evaluating comparable sales...',
  'Assessing risk factors...',
  'Checking zoning classifications...',
  'Reviewing local building codes...',
  'Generating investment report...',
];

import { useState, useEffect } from 'react';

export default function LoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="relative mb-6">
        <div className="spinner"></div>
        <Building2 className="absolute inset-0 m-auto w-5 h-5 text-brand-600" />
      </div>
      <p className="text-slate-700 font-medium text-base mb-1">Analyzing Property</p>
      <p className="text-slate-400 text-sm transition-all duration-300" key={step}>
        {STEPS[step]}
      </p>
    </div>
  );
}
