import React from 'react';

interface BottomNavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function BottomNav({ items, activeId, onSelect }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0a0f1d]/95 backdrop-blur-xl border-t border-white/10 flex z-50"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex flex-col items-center justify-center py-2 flex-1 min-h-[56px] transition-colors relative ${
              isActive ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold badge-pop">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </div>
            <span className={`text-[10px] mt-1 ${isActive ? 'font-bold text-blue-400' : 'font-medium text-slate-600'}`}>
              {item.label}
            </span>
            {isActive && (
              <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-blue-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
