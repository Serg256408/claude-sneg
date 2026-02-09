import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  dark?: boolean;
}

export function EmptyState({ icon, title, description, action, compact, dark = true }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-8' : 'py-16'}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
        dark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400'
      }`}>
        {icon}
      </div>
      <p className={`text-sm font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
        {title}
      </p>
      {description && (
        <p className={`text-xs mt-1 max-w-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider btn-lift transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
