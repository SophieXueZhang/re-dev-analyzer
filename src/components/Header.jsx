import { Building2 } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">RE Dev Analyzer</h1>
              <p className="text-xs text-slate-500 leading-tight">US Real Estate Investment Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              AI-Powered
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
