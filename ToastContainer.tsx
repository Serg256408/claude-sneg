import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast } from './ToastContext';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-green-500/90 border-green-400/30 text-white',
  error: 'bg-red-500/90 border-red-400/30 text-white',
  warning: 'bg-amber-500/90 border-amber-400/30 text-white',
  info: 'bg-blue-500/90 border-blue-400/30 text-white',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const Icon = iconMap[toast.type];

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`${colorMap[toast.type]} ${exiting ? 'toast-exit' : 'toast-enter'}
        rounded-2xl px-4 py-3 shadow-2xl border backdrop-blur-xl
        flex items-center gap-3 min-w-[280px] max-w-[400px] cursor-pointer`}
      onClick={handleDismiss}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden">
        <div
          className="h-full bg-white/30"
          style={{
            animation: `shrinkWidth ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 sm:bottom-4 sm:right-4 max-sm:bottom-20 max-sm:left-4 max-sm:right-4">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}
