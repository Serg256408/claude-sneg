import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo';
  dark?: boolean;
  onClick?: () => void;
}

const colorStyles = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: 'bg-blue-500/20 text-blue-400' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', icon: 'bg-green-500/20 text-green-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: 'bg-amber-500/20 text-amber-400' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', icon: 'bg-red-500/20 text-red-400' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: 'bg-purple-500/20 text-purple-400' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', icon: 'bg-indigo-500/20 text-indigo-400' },
};

export function StatCard({ icon, label, value, trend, color = 'blue', dark = true, onClick }: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 border transition-all ${
        dark ? 'bg-[#12192c] border-white/5' : 'bg-white border-slate-200 shadow-sm'
      } ${onClick ? 'cursor-pointer card-hover' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${styles.icon}`}>
        {icon}
      </div>
      <div className="count-up">
        <p className={`text-2xl font-black ${dark ? 'text-white' : 'text-slate-900'}`}>
          {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
        </p>
        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
          dark ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {label}
        </p>
      </div>
      {trend && (
        <p className={`text-xs mt-2 font-medium ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
        </p>
      )}
    </div>
  );
}
