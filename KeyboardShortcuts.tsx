import React, { useEffect, useState, useCallback } from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutAction {
  key: string;
  label: string;
  description: string;
}

const SHORTCUTS: ShortcutAction[] = [
  { key: 'N', label: 'N', description: 'Новый заказ' },
  { key: 'F', label: 'F', description: 'Фокус на поиск' },
  { key: 'Escape', label: 'Esc', description: 'Закрыть / Назад' },
  { key: '?', label: '?', description: 'Показать подсказки' },
];

interface KeyboardShortcutsProps {
  onNewOrder?: () => void;
  onFocusSearch?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({ onNewOrder, onFocusSearch, onEscape, enabled = true }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    // Don't trigger on inputs/textareas
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
      if (e.key === 'Escape') {
        (target as HTMLInputElement).blur();
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        onNewOrder?.();
        break;
      case 'f':
        e.preventDefault();
        onFocusSearch?.();
        break;
      case 'escape':
        e.preventDefault();
        if (showHelp) {
          setShowHelp(false);
        } else {
          onEscape?.();
        }
        break;
      case '?':
        e.preventDefault();
        setShowHelp(prev => !prev);
        break;
    }
  }, [enabled, onNewOrder, onFocusSearch, onEscape, showHelp]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutHelpModal({ isOpen, onClose }: ShortcutHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm modal-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-slate-400" />
            <span className="font-black text-sm">Горячие клавиши</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{s.description}</span>
              <kbd className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-black text-slate-600 min-w-[36px] text-center">
                {s.label}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
